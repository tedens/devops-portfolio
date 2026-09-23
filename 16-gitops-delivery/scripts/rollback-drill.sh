#!/usr/bin/env bash
#
# Ships a deliberately broken build and proves the canary rolls itself back.
#
# The claim being tested is narrow and worth stating exactly: a build that
# fails 60% of its requests must be detected by the analysis and aborted
# without anybody intervening, and the stable version must still be serving
# when it is over.
#
#   ./scripts/rollback-drill.sh              broken build, expect a rollback
#   ./scripts/rollback-drill.sh --healthy    good build, expect a promotion
#
# The healthy run is not decoration. An analysis that rejects everything
# passes the rollback test and is useless, so both directions are checked.

set -euo pipefail

cd "$(dirname "$0")/.."

NS=demo
ROLLOUT=demo-service
TIMEOUT="${TIMEOUT:-420}"

MODE=broken
IMAGE=demo-service:broken
EXPECT=Degraded
[[ "${1:-}" == "--healthy" ]] && {
	MODE=healthy
	IMAGE=demo-service:v2
	EXPECT=Healthy
}

log() { printf '\n==> %s\n' "$*"; }

rollout_field() {
	kubectl -n "$NS" get rollout "$ROLLOUT" -o jsonpath="{$1}" 2>/dev/null || true
}

stable_hash() { rollout_field .status.stableRS; }
phase() { rollout_field .status.phase; }
current_image() {
	kubectl -n "$NS" get rollout "$ROLLOUT" \
		-o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || true
}

# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Argo CD
#
# Under GitOps a deploy is a commit. This drill changes the image with
# kubectl, which is an out-of-band change, and an Application with
# selfHeal: true reverts it. The first run against the real GitOps path did
# exactly that: no AnalysisRun was created, the stable ReplicaSet never
# moved, and the rollout sat Healthy while the drill timed out. Argo CD was
# working correctly; the drill was wrong.
#
# Suspending the demo-service Application alone is not enough, which is the
# app-of-apps lesson. The root Application owns apps/demo-service.yaml and
# also self-heals, so it puts the automated block straight back and the
# child resumes reverting. Every Application with automated sync has to be
# suspended, root included, and every one of them restored afterwards.
#
# A fire drill that needs a commit per run is a fire drill nobody does.
# Leaving sync off afterwards would be its own kind of drift, so the restore
# runs from a trap and covers the failure path too.
# ---------------------------------------------------------------------------

suspended_apps=()

restore_sync() {
	local app
	for app in "${suspended_apps[@]:-}"; do
		[[ -z "$app" ]] && continue
		kubectl -n argocd patch application "$app" --type=merge \
			-p '{"spec":{"syncPolicy":{"automated":{"selfHeal":true,"prune":true}}}}' >/dev/null 2>&1 || true
		echo "restored automated sync on $app"
	done
	suspended_apps=()
}

if kubectl -n argocd get applications >/dev/null 2>&1; then
	# Root first. Suspending a child while the root still self-heals means
	# the root simply writes the child's automated block back.
	mapfile -t automated < <(
		kubectl -n argocd get applications -o json 2>/dev/null |
			jq -r '.items[] | select(.spec.syncPolicy.automated != null) | .metadata.name' |
			sort --key=1,1 --stable |
			awk '/^root$/ {print; next} {rest = rest $0 ORS} END {printf "%s", rest}'
	)

	if [[ "${#automated[@]}" -gt 0 && -n "${automated[0]:-}" ]]; then
		log "suspending Argo CD automated sync: ${automated[*]}"
		trap restore_sync EXIT
		for app in "${automated[@]}"; do
			kubectl -n argocd patch application "$app" --type=json \
				-p '[{"op": "remove", "path": "/spec/syncPolicy/automated"}]' >/dev/null
			suspended_apps+=("$app")
		done

		# The controller may already have a reconcile in flight against the
		# old policy. Give it a moment before making the change it would
		# otherwise undo.
		sleep 5
	fi
fi

log "before"
before_stable=$(stable_hash)
before_image=$(current_image)
echo "  image        $before_image"
echo "  stable RS    $before_stable"
echo "  phase        $(phase)"

if [[ "$(phase)" != "Healthy" ]]; then
	echo
	echo "The rollout is not Healthy to begin with, so a rollback afterwards"
	echo "would prove nothing. Wait for it to settle, or run scripts/up.sh."
	exit 1
fi

# ---------------------------------------------------------------------------

log "shipping $IMAGE ($MODE)"

# A JSON patch naming the exact field, not a merge patch.
#
# --type=merge is RFC 7386, which replaces arrays wholesale rather than
# merging by key. Patching containers with {"name":"app","image":"..."} does
# not update the image of the existing container; it replaces the whole
# containers array with that object, discarding ports, probes, env,
# resources and securityContext.
#
# The failure that follows is not obvious. The canary pod comes up with no
# named port, so the EndpointSlice controller cannot resolve targetPort: http
# and puts it in a slice with no ports at all. It shows as a ready endpoint
# and receives no traffic. http_requests_total is therefore never emitted for
# the canary, the analysis query returns an empty vector, and the rollout
# aborts. Broken builds and healthy builds both abort, for a reason that has
# nothing to do with either.
#
# --type=strategic would merge by container name, and is not available here:
# strategic merge patch needs Go struct tags the API server does not have for
# a CRD. A JSON patch addressing the field directly is the CRD-safe way.
kubectl -n "$NS" patch rollout "$ROLLOUT" --type=json -p "$(
	cat <<JSON
[{"op": "replace", "path": "/spec/template/spec/containers/0/image", "value": "$IMAGE"},
 {"op": "replace", "path": "/spec/template/spec/containers/0/env/0/value", "value": "$MODE-$(date +%s)"}]
JSON
)" >/dev/null

# Cheap assertion, because the bug above was silent for three runs. If the
# patch has damaged the container spec, say so now rather than spending seven
# minutes watching a rollout fail for the wrong reason.
port_name=$(kubectl -n "$NS" get rollout "$ROLLOUT" \
	-o jsonpath='{.spec.template.spec.containers[0].ports[0].name}' 2>/dev/null || true)
if [[ "$port_name" != "http" ]]; then
	echo "the patch damaged the container spec: port name is '${port_name:-missing}', expected 'http'" >&2
	exit 1
fi

echo "Watching. The analysis takes five measurements thirty seconds apart and"
echo "aborts after two consecutive failures, so a rollback lands inside the"
echo "first pause rather than at the end of the rollout."

# ---------------------------------------------------------------------------

deadline=$((SECONDS + TIMEOUT))
last=""
result=""

while ((SECONDS < deadline)); do
	p=$(phase)
	weight=$(rollout_field .status.currentStepIndex)
	line="phase=$p step=${weight:-0}"
	[[ "$line" != "$last" ]] && {
		printf '    %-40s %s\n' "$line" "$(date +%H:%M:%S)"
		last="$line"
	}

	case "$p" in
	Degraded)
		result=Degraded
		break
		;;
	Healthy)
		# Healthy only counts once the new image has actually been promoted;
		# the rollout reports Healthy for a moment before it starts.
		[[ "$(current_image)" == "$IMAGE" && "$(stable_hash)" != "$before_stable" ]] && {
			result=Healthy
			break
		}
		;;
	esac
	sleep 5
done

[[ -z "$result" ]] && result="timeout after ${TIMEOUT}s"

# ---------------------------------------------------------------------------

log "after"
after_stable=$(stable_hash)
echo "  phase        $(phase)"
echo "  stable RS    $after_stable"
echo "  message      $(rollout_field .status.message)"

log "analysis runs"
kubectl -n "$NS" get analysisrun \
	-o custom-columns='NAME:.metadata.name,STATUS:.status.phase,MEASUREMENTS:.status.metricResults[0].measurements[*].phase' \
	2>/dev/null | tail -5 || true

log "is anything still serving?"
# The question a rollback is for. If the stable pods went down with the
# canary, the rollback worked and the outage happened anyway.
#
# The output used to be swallowed by 2>/dev/null, so a probe that failed to
# schedule printed nothing at all and read as a pass. Silence is the one
# result this script must never treat as success.
probe_out=$(kubectl -n "$NS" run "drill-probe-$$" --rm -i --restart=Never \
	--image=curlimages/curl:8.11.1 --quiet -- \
	sh -c 'ok=0; for i in $(seq 1 20); do
	  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 http://demo-service.demo.svc.cluster.local/ || echo 000)
	  [ "$code" = "200" ] && ok=$((ok+1))
	done; echo "$ok/20 requests returned 200"' 2>&1) || true

if [[ "$probe_out" =~ ([0-9]+)/20 ]]; then
	echo "  ${BASH_REMATCH[0]}"
	if [[ "${BASH_REMATCH[1]}" -lt 18 ]]; then
		echo "  the rollback completed and the service was still degraded" >&2
	fi
else
	echo "  the probe did not report; treating that as unknown, not as healthy" >&2
	echo "  ${probe_out:-no output}" >&2
fi

# ---------------------------------------------------------------------------

echo
if [[ "$result" == "$EXPECT" ]]; then
	if [[ "$MODE" == broken ]]; then
		echo "PASS: the broken build was rejected and rolled back on its own."
		[[ "$after_stable" == "$before_stable" ]] ||
			echo "  note: the stable ReplicaSet changed, which it should not have."
	else
		echo "PASS: the healthy build was promoted."
	fi
	exit 0
fi

echo "FAIL: expected $EXPECT, got $result"
echo
echo "The usual causes, in the order they are usually true:"
echo "  - the analysis query matched no series, so it measured nothing."
echo "    check:  kubectl -n $NS get analysisrun -o yaml | grep -A5 measurements"
echo "  - Prometheus is not scraping the canary pods."
echo "    check:  kubectl -n monitoring port-forward svc/prometheus 9090:9090"
echo "            then query http_requests_total"
echo "  - no traffic reached the canary, so its rate was zero."
exit 1

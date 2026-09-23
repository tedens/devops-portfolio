#!/usr/bin/env bash
#
# Burns the error budget on purpose and proves the page goes out, then stops
# burning and proves the page clears.
#
# What is being tested is delivery, not evaluation. promtool already proved
# the rule fires on these inputs. This proves the whole chain: the broken
# build serves errors, Prometheus scrapes them, the recording rules compute
# the ratio, the alert fires, Alertmanager routes it to the pager receiver,
# the webhook arrives. Then the reverse. And, while the page is firing, a
# ticket for the same service and SLO is injected and must NOT be delivered,
# which is the inhibition rule doing its one job.
#
#   ./scripts/burn-drill.sh

set -euo pipefail
cd "$(dirname "$0")/.."

CTX="${CTX:-kind-gitops-demo}"
TIMEOUT="${TIMEOUT:-900}"
k() { kubectl --context "$CTX" "$@"; }
log() { printf '\n==> %s\n' "$*"; }

pass=0; fail=0
check() {
	local name="$1" ok="$2"
	if [[ "$ok" == true ]]; then printf '   PASS  %s\n' "$name"; pass=$((pass + 1)); else printf '   FAIL  %s\n' "$name"; fail=$((fail + 1)); fi
}

prom() { k -n monitoring exec deploy/prometheus -- wget -q -O- "http://127.0.0.1:9090/api/v1/$1" 2>/dev/null; }
alerting_state() { prom alerts | jq -r --arg a "$1" '[.data.alerts[] | select(.labels.alertname==$a and .labels.slo=="availability")] | first | .state // "inactive"'; }
sink_since() { k -n monitoring logs deploy/alert-sink --since-time="$1" 2>/dev/null | grep -E '^\{' || true; }
burn_ratio() { prom 'query?query=slo:sli_error:ratio_rate5m%7Bslo%3D%22availability%22%7D' | jq -r '.data.result[0].value[1] // "none"'; }

# True only if at least one notification matching receiver, alertname and
# status has reached the sink since the given time.
#
# Not "jq -e select(...)". jq 1.6's -e exits 0 when it produces no output at
# all, so on an empty log it reports success. The first run of this drill
# declared the page delivered 45 seconds in, on an empty log, while Prometheus
# still showed the alert inactive, then tore the burn down before the real
# page fired. Silence is the one result this script must never treat as
# success, so the match is counted.
delivered_since() {
	local since="$1" receiver="$2" alertname="$3" status="$4" n
	n=$(sink_since "$since" | jq -c --arg r "$receiver" --arg a "$alertname" --arg s "$status" \
		'select(.receiver==$r and .alertname==$a and .status==$s and (.slo==null or .slo=="availability"))' | wc -l | tr -d " ")
	[[ "${n:-0}" -gt 0 ]]
}

# RFC3339 timestamps for amtool, on either date(1).
ts_now() { date -u +%Y-%m-%dT%H:%M:%SZ; }
ts_plus() { date -u -v+"$1"M +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d "+$1 min" +%Y-%m-%dT%H:%M:%SZ; }

cleanup() {
	k -n demo delete deploy demo-service-burn --ignore-not-found --wait=false >/dev/null 2>&1 || true
}
trap cleanup EXIT

# ---------------------------------------------------------------------------
log "before"
echo "   ErrorBudgetBurnFast: $(alerting_state ErrorBudgetBurnFast)   ratio5m: $(burn_ratio)"
if [[ "$(alerting_state ErrorBudgetBurnFast)" != "inactive" ]]; then
	echo "already burning; a drill has to start from quiet" >&2; exit 1
fi
started=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# ---------------------------------------------------------------------------
log "burning: five pods of the broken build behind the same Service"
# Same app label as the real pods, so the unpinned Service sends them
# traffic in proportion. The broken build fails 60% of requests, so with
# five broken pods beside five good ones the fleet error ratio is about 30%,
# thirty times the 1% page threshold for a 14.4x burn.
cat <<EOF | k apply -f - >/dev/null
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demo-service-burn
  namespace: demo
  labels: { app: demo-service, drill: burn }
spec:
  replicas: 5
  selector:
    matchLabels: { app: demo-service, drill: burn }
  template:
    metadata:
      labels: { app: demo-service, drill: burn }
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: /metrics
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        seccompProfile: { type: RuntimeDefault }
      containers:
        - name: app
          image: demo-service:broken
          imagePullPolicy: IfNotPresent
          ports: [{ name: http, containerPort: 8080 }]
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities: { drop: ["ALL"] }
          resources:
            requests: { cpu: 10m, memory: 32Mi }
            limits: { memory: 64Mi }
          readinessProbe:
            httpGet: { path: /readyz, port: http }
EOF
k -n demo rollout status deploy/demo-service-burn --timeout=120s >/dev/null

log "waiting for the page (alert firing, then delivered to /pager)"
deadline=$((SECONDS + TIMEOUT)); fired=false; delivered=false; last=""
while ((SECONDS < deadline)); do
	st=$(alerting_state ErrorBudgetBurnFast); r=$(burn_ratio)
	line="alert=$st ratio5m=${r:0:6}"
	[[ "$line" != "$last" ]] && { printf '   %-42s %s\n' "$line" "$(date +%H:%M:%S)"; last="$line"; }
	[[ "$st" == "firing" ]] && fired=true
	if delivered_since "$started" pager ErrorBudgetBurnFast firing; then
		delivered=true
		# Delivery can land between two polls; read the state once more so a
		# page that fired and was sent inside one interval is not marked as
		# never having fired.
		[[ "$(alerting_state ErrorBudgetBurnFast)" == "firing" ]] && fired=true
		break
	fi
	sleep 10
done
check "ErrorBudgetBurnFast reached state firing" "$fired"
check "a firing notification arrived at the pager receiver" "$delivered"
sink_since "$started" | jq -c 'select(.alertname=="ErrorBudgetBurnFast") | {receiver,status,alertname,slo,startsAt}' | head -3 | sed 's/^/     /'

# ---------------------------------------------------------------------------
log "inhibition: a ticket for the same service and SLO must not be delivered while the page fires"
am() { k -n monitoring exec deploy/alertmanager -- amtool --alertmanager.url=http://127.0.0.1:9093 "$@"; }
# --start as well as --end. With only --end, Alertmanager recorded the alert
# as starting at the end time, twenty minutes in the future.
injected_at=$(ts_now)
am alert add alertname=ErrorBudgetBurnSlow severity=ticket service=demo-service slo=availability \
	--annotation=summary="injected by burn-drill.sh to test inhibition" \
	--start="$injected_at" --end="$(ts_plus 20)" >/dev/null
sleep 45
inhibited=$(am alert query --inhibited alertname=ErrorBudgetBurnSlow -o json | jq 'length')
ticket_delivered=false
delivered_since "$injected_at" ticket ErrorBudgetBurnSlow firing && ticket_delivered=true
check "the injected ticket is held as inhibited by Alertmanager ($inhibited inhibited)" "$([[ "${inhibited:-0}" -ge 1 ]] && echo true || echo false)"
check "no ticket notification for it reached the sink while the page was firing" "$([[ "$ticket_delivered" == false ]] && echo true || echo false)"

# ---------------------------------------------------------------------------
log "stop burning"
cleanup
cleared_at=$(ts_now)

# How much history the recording rules have. Every long window is an average
# over the recorded series inside it, so with twenty minutes of history the
# "6h" ratio is a twenty-minute ratio, and a burn that was a large share of
# those twenty minutes holds the 6x pair true long after it stops. That is
# not the alert misbehaving; it is the honest answer to "what was the error
# ratio over all the data you have". In steady state the 6h ratio for a
# five-minute burn is about 0.5% and the page clears within minutes of the
# 5m window emptying; tests/slo_alerts_test.yaml proves that with seven
# hours of synthetic history. Here, the check is gated on real history.
history_s=$(prom "query?query=$(printf '%s' 'count_over_time(slo:sli_requests:rate5m{slo="availability"}[7d]) * 30' | jq -sRr @uri)" | jq -r '.data.result[0].value[1] // "0"' | cut -d. -f1)
printf '   recording rules have about %d minutes of history\n' "$((history_s / 60))"

log "the short window must empty within six minutes of the burn stopping"
deadline=$((SECONDS + 420)); short_clear=false; last=""
while ((SECONDS < deadline)); do
	r=$(burn_ratio)
	line="ratio5m=${r:0:6}"
	[[ "$line" != "$last" ]] && { printf '   %-42s %s\n' "$line" "$(date +%H:%M:%S)"; last="$line"; }
	# NaN (no errors at all in the window) also counts as clear.
	if [[ "$r" == "none" || "$r" == "NaN" ]] || awk -v v="$r" 'BEGIN { exit !(v < 0.0144) }'; then short_clear=true; break; fi
	sleep 10
done
check "ratio5m fell below the page threshold within six minutes" "$short_clear"

if ((history_s >= 6 * 3600)); then
	log "history covers the longest window: the page must clear on its own"
	deadline=$((SECONDS + TIMEOUT)); resolved=false; last=""
	while ((SECONDS < deadline)); do
		st=$(alerting_state ErrorBudgetBurnFast); r=$(burn_ratio)
		line="alert=$st ratio5m=${r:0:6}"
		[[ "$line" != "$last" ]] && { printf '   %-42s %s\n' "$line" "$(date +%H:%M:%S)"; last="$line"; }
		if delivered_since "$cleared_at" pager ErrorBudgetBurnFast resolved; then resolved=true; break; fi
		sleep 10
	done
	check "a resolved notification arrived at the pager receiver" "$resolved"

	# With the page gone, the injected ticket is no longer inhibited and
	# should now be delivered. That is what separates "inhibited" from "lost".
	sleep 60
	released=false
	delivered_since "$cleared_at" ticket ErrorBudgetBurnSlow firing && released=true
	check "the held ticket was delivered once the page cleared" "$released"
else
	echo
	echo "==> resolution timing skipped: the rules have $((history_s / 60)) minutes of history and the longest window is 6h."
	echo "    Long-window ratios right now, which are really $((history_s / 60))-minute ratios:"
	for w in 30m 1h 6h; do
		v=$(prom "query?query=$(printf 'slo:sli_error:ratio_rate%s{slo="availability"}' "$w" | jq -sRr @uri)" | jq -r '.data.result[0].value[1] // "none"')
		printf '      %-4s %s\n' "$w" "${v:0:8}"
	done
	echo "    Steady-state resolution is proven offline: tests/slo_alerts_test.yaml, last case."
fi

# Expire the injected alert so the next drill starts quiet.
am alert add alertname=ErrorBudgetBurnSlow severity=ticket service=demo-service slo=availability \
	--start="$injected_at" --end="$(ts_now)" >/dev/null 2>&1 || true

# ---------------------------------------------------------------------------
echo
total=$((pass + fail))
if [[ "$fail" -eq 0 ]]; then echo "PASS: $pass/$total. It paged, it did not double-notify, and the short window emptied."; exit 0; fi
echo "FAIL: $fail of $total checks. Sink log since $started:"; sink_since "$started" | head -20; exit 1

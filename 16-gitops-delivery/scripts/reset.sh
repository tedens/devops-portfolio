#!/usr/bin/env bash
#
# Returns the rollout to a clean v1 Healthy state.
#
# An aborted Rollout stays Degraded until something clears the abort, and
# setting the image back does not do it. Patching status.abort makes the
# controller retry the revision it just rejected, which is not what "reset"
# should mean. Recreating the Rollout is the honest way back to a known
# starting point, and a drill that starts from an unknown one proves nothing.

set -euo pipefail

cd "$(dirname "$0")/.."
NS=demo

kubectl -n "$NS" delete rollout demo-service --ignore-not-found --wait=true >/dev/null
kubectl -n "$NS" delete analysisrun --all --ignore-not-found >/dev/null 2>&1 || true
kubectl -n "$NS" apply -f manifests/demo-service/rollout.yaml >/dev/null

echo "waiting for demo-service to come back on v1"
for _ in $(seq 1 60); do
	phase=$(kubectl -n "$NS" get rollout demo-service -o jsonpath='{.status.phase}' 2>/dev/null || true)
	[[ "$phase" == "Healthy" ]] && {
		echo "Healthy, stable=$(kubectl -n "$NS" get rollout demo-service -o jsonpath='{.status.stableRS}')"
		exit 0
	}
	sleep 5
done

echo "did not reach Healthy within 300s; current phase: ${phase:-unknown}" >&2
exit 1

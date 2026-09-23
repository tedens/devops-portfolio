#!/usr/bin/env bash
#
# Installs the rules, Alertmanager and the notification sink into project
# 16's cluster and tells Prometheus to reload.
#
# The real path is Argo CD: 16-gitops-delivery/apps/slo-alerting.yaml points
# at this directory's kustomization and the cluster follows git. This script is the same apply
# done by hand, for iterating before a push. It does not touch the Argo CD
# Applications; if automated sync is on, it will revert anything here that
# differs from main within minutes, which is the correct behaviour and the
# reason to push rather than fight it.

set -euo pipefail
cd "$(dirname "$0")/.."

CTX="${CTX:-kind-gitops-demo}"
k() { kubectl --context "$CTX" "$@"; }

log() { printf '\n==> %s\n' "$*"; }

# Order matters. The rules ConfigMap goes in first so that when Prometheus
# restarts with the new volume, the kubelet has something to mount. The first
# version of this script did it the other way round: Prometheus started with
# an empty optional volume, the kubelet filled it about a minute later, and a
# reload sent fifteen seconds in loaded zero rules and declared failure.
log "rules, alertmanager, sink"
k apply -k .
k -n monitoring rollout status deploy/alertmanager --timeout=120s
k -n monitoring rollout status deploy/alert-sink --timeout=120s

log "prometheus in project 16 must mount the rules and know about alertmanager"
k apply -f ../16-gitops-delivery/manifests/monitoring/prometheus.yaml >/dev/null
k -n monitoring rollout status deploy/prometheus --timeout=120s

log "waiting for prometheus to load the rules"
# A mounted ConfigMap can take up to the kubelet sync period (about a
# minute) to appear or change. Reload on every attempt; it is idempotent.
n=0
for _ in $(seq 1 30); do
	k -n monitoring exec deploy/prometheus -- wget -q -O- --post-data= http://127.0.0.1:9090/-/reload >/dev/null 2>&1 || true
	n=$(k -n monitoring exec deploy/prometheus -- wget -q -O- http://127.0.0.1:9090/api/v1/rules 2>/dev/null |
		jq '[.data.groups[].rules[]] | length' 2>/dev/null || echo 0)
	[[ "${n:-0}" -ge 21 ]] && break
	sleep 5
done
echo "  prometheus reports $n rules loaded"
[[ "${n:-0}" -ge 21 ]] || { echo "rules did not load within 150s; check: kubectl -n monitoring exec deploy/prometheus -- ls /etc/prometheus/rules" >&2; exit 1; }

log "alertmanager is reachable from prometheus"
k -n monitoring exec deploy/prometheus -- wget -q -O- http://127.0.0.1:9090/api/v1/alertmanagers 2>/dev/null |
	jq -r '.data.activeAlertmanagers[].url' | sed 's/^/  /'

echo; echo "installed. next: ./scripts/burn-drill.sh"

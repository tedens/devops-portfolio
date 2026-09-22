#!/usr/bin/env bash
# Prove the cluster survives a spot reclaim, rather than hoping it does.
#
#   ./interruption-drill.sh --cluster my-cluster --deployment web --namespace default
#
# Uses AWS Fault Injection Simulator to send a real two-minute spot
# interruption notice to a node that is actually running the workload, then
# watches whether the workload stayed available. This is the test the whole
# project exists to pass: configuring spot is easy, surviving a reclaim is
# the part that is worth demonstrating.

set -euo pipefail

CLUSTER="" DEPLOY="" NS="default" REGION="${AWS_REGION:-us-east-2}" ROLE_ARN="${FIS_ROLE_ARN:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --cluster)    CLUSTER="$2"; shift 2 ;;
    --deployment) DEPLOY="$2"; shift 2 ;;
    --namespace)  NS="$2"; shift 2 ;;
    --region)     REGION="$2"; shift 2 ;;
    --role-arn)   ROLE_ARN="$2"; shift 2 ;;
    -h|--help)    sed -n '2,12p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

: "${CLUSTER:?--cluster is required}"
: "${DEPLOY:?--deployment is required}"
: "${ROLE_ARN:?--role-arn or FIS_ROLE_ARN is required}"
export AWS_REGION="$REGION"

log() { printf '[%s] %s\n' "$(date -u +%H:%M:%S)" "$*" >&2; }

ready() { kubectl -n "$NS" get deploy "$DEPLOY" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo 0; }

desired=$(kubectl -n "$NS" get deploy "$DEPLOY" -o jsonpath='{.spec.replicas}')
log "baseline: $(ready)/${desired} ready"

# Pick a spot node that is actually carrying some of the workload. Draining an
# idle node proves nothing.
node=$(kubectl -n "$NS" get pods -l "app=${DEPLOY}" \
  -o jsonpath='{range .items[*]}{.spec.nodeName}{"\n"}{end}' |
  sort -u |
  while read -r n; do
    [[ -z "$n" ]] && continue
    if [[ "$(kubectl get node "$n" -o jsonpath='{.metadata.labels.karpenter\.sh/capacity-type}')" == "spot" ]]; then
      echo "$n"; break
    fi
  done)

[[ -n "$node" ]] || { log "no spot node is running ${DEPLOY}; nothing to interrupt"; exit 1; }

instance_id=$(kubectl get node "$node" -o jsonpath='{.spec.providerID}' | awk -F/ '{print $NF}')
log "interrupting ${node} (${instance_id})"

template=$(mktemp)
cat >"$template" <<JSON
{
  "description": "Spot interruption drill for ${CLUSTER}",
  "roleArn": "${ROLE_ARN}",
  "stopConditions": [{ "source": "none" }],
  "targets": {
    "one-node": {
      "resourceType": "aws:ec2:spot-instance",
      "resourceArns": ["arn:aws:ec2:${REGION}:$(aws sts get-caller-identity --query Account --output text):instance/${instance_id}"],
      "selectionMode": "ALL"
    }
  },
  "actions": {
    "interrupt": {
      "actionId": "aws:ec2:send-spot-instance-interruptions",
      "parameters": { "durationBeforeInterruption": "PT2M" },
      "targets": { "SpotInstances": "one-node" }
    }
  },
  "tags": { "Name": "karpenter-spot-drill" }
}
JSON

exp_template=$(aws fis create-experiment-template --cli-input-json "file://${template}" \
  --query 'experimentTemplate.id' --output text)
rm -f "$template"

exp_id=$(aws fis start-experiment --experiment-template-id "$exp_template" \
  --query 'experiment.id' --output text)
log "FIS experiment ${exp_id} started, two-minute notice issued"

# Watch availability for the duration of the notice plus the replacement.
min_ready=$desired
for _ in $(seq 1 40); do
  r=$(ready); r=${r:-0}
  (( r < min_ready )) && min_ready=$r
  printf '  ready=%s/%s node=%s\n' "$r" "$desired" \
    "$(kubectl get node "$node" -o jsonpath='{.spec.unschedulable}' 2>/dev/null || echo gone)" >&2
  kubectl get node "$node" >/dev/null 2>&1 || { log "node removed"; break; }
  sleep 15
done

sleep 30
final=$(ready)
aws fis delete-experiment-template --id "$exp_template" >/dev/null 2>&1 || true

log "lowest ready during the drill: ${min_ready}/${desired}"
log "final: ${final}/${desired}"

pdb_min=$(kubectl -n "$NS" get pdb "$DEPLOY" -o jsonpath='{.spec.minAvailable}' 2>/dev/null || echo "")
if [[ -n "$pdb_min" && "$min_ready" -lt "$pdb_min" ]]; then
  log "FAIL: availability fell below the PDB floor of ${pdb_min}"
  exit 1
fi
[[ "$final" == "$desired" ]] || { log "FAIL: did not recover to ${desired}"; exit 1; }
log "PASS: stayed above the floor and recovered"

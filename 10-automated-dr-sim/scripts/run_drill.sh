#!/usr/bin/env bash
# Run a full disaster recovery drill and tear it down again.
#
#   ./run_drill.sh --source-db prod-db --database appdb \
#                  --secret arn:aws:secretsmanager:...:prod/db \
#                  --tables "users orders invoices" \
#                  --freshness-table orders
#
# Resolves the newest snapshot, builds an isolated recovery environment,
# proves the data is really there, records how long recovery took, and
# destroys everything. The teardown runs from a trap, so an environment
# holding a copy of production data is not left running because a check
# failed halfway through.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_DIR="${HERE}/../terraform"
REGION="${AWS_REGION:-us-east-2}"
DRILL_ID="drill-$(date -u +%Y%m%dT%H%M%SZ)"
RESULTS_DIR="${HERE}/../results"
KEEP=0

SOURCE_DB="" DB_NAME="" SECRET_ARN="" TABLES="" FRESHNESS_TABLE="" SNAPSHOT=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source-db)       SOURCE_DB="$2"; shift 2 ;;
    --snapshot)        SNAPSHOT="$2"; shift 2 ;;
    --database)        DB_NAME="$2"; shift 2 ;;
    --secret)          SECRET_ARN="$2"; shift 2 ;;
    --tables)          TABLES="$2"; shift 2 ;;
    --freshness-table) FRESHNESS_TABLE="$2"; shift 2 ;;
    --region)          REGION="$2"; shift 2 ;;
    --keep)            KEEP=1; shift ;;      # leave it up to poke at, on purpose
    -h|--help)         sed -n '2,14p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

: "${DB_NAME:?--database is required}"
: "${SECRET_ARN:?--secret is required}"
export AWS_REGION="$REGION"

log() { printf '[%s] %s\n' "$(date -u +%H:%M:%S)" "$*" >&2; }

teardown() {
  local code=$?
  if [[ "$KEEP" == "1" ]]; then
    log "--keep set: leaving the environment up. Destroy it with scripts/teardown.sh"
    return $code
  fi
  log "tearing down"
  terraform -chdir="$TF_DIR" destroy -auto-approve -no-color \
    -var="rds_snapshot_id=${SNAPSHOT:-unused}" \
    -var="drill_id=${DRILL_ID}" \
    -var="db_credentials_secret_arn=${SECRET_ARN}" >/dev/null 2>&1 ||
    log "TEARDOWN FAILED. Check for leftover ${DRILL_ID} resources before leaving."
  return $code
}
trap teardown EXIT

# ---------------------------------------------------------------- 1. snapshot

if [[ -z "$SNAPSHOT" ]]; then
  : "${SOURCE_DB:?--source-db or --snapshot is required}"
  log "resolving newest snapshot for ${SOURCE_DB}"
  SNAPSHOT=$("${HERE}/latest_snapshot.sh" "$SOURCE_DB" "$REGION")
fi
log "restoring from ${SNAPSHOT}"

snapshot_time=$(aws rds describe-db-snapshots --region "$REGION" \
  --db-snapshot-identifier "$SNAPSHOT" \
  --query 'DBSnapshots[0].SnapshotCreateTime' --output text)

# ------------------------------------------------------------------- 2. build

recovery_started=$(date +%s)

terraform -chdir="$TF_DIR" init -input=false -no-color >/dev/null
terraform -chdir="$TF_DIR" apply -auto-approve -input=false -no-color \
  -var="rds_snapshot_id=${SNAPSHOT}" \
  -var="drill_id=${DRILL_ID}" \
  -var="db_credentials_secret_arn=${SECRET_ARN}" \
  -var="aws_region=${REGION}" >/dev/null

DB_HOST=$(terraform -chdir="$TF_DIR" output -raw db_endpoint)
DB_PORT=$(terraform -chdir="$TF_DIR" output -raw db_port)
INSTANCE_ID=$(terraform -chdir="$TF_DIR" output -raw validator_instance_id)
PUBLIC=$(terraform -chdir="$TF_DIR" output -raw publicly_accessible)

# A restored snapshot is production data. If a future edit ever makes it
# publicly reachable, stop here rather than carrying on with the drill.
if [[ "$PUBLIC" != "false" ]]; then
  log "REFUSING TO CONTINUE: restored instance is publicly accessible"
  exit 1
fi

log "restored to ${DB_HOST}, validating from ${INSTANCE_ID}"

# --------------------------------------------------------------- 3. validate

# Wait for SSM to register the validator before sending it work.
for _ in $(seq 1 30); do
  state=$(aws ssm describe-instance-information --region "$REGION" \
    --filters "Key=InstanceIds,Values=${INSTANCE_ID}" \
    --query 'InstanceInformationList[0].PingStatus' --output text 2>/dev/null || true)
  [[ "$state" == "Online" ]] && break
  sleep 10
done
[[ "$state" == "Online" ]] || { log "validator never came online"; exit 1; }

cmd_id=$(aws ssm send-command --region "$REGION" \
  --instance-ids "$INSTANCE_ID" \
  --document-name AWS-RunShellScript \
  --comment "DR drill ${DRILL_ID}" \
  --parameters commands="$(printf '%s' "
export DB_HOST='${DB_HOST}' DB_PORT='${DB_PORT}' DB_SECRET_ARN='${SECRET_ARN}'
export DB_NAME='${DB_NAME}' CHECK_TABLES='${TABLES}' FRESHNESS_TABLE='${FRESHNESS_TABLE}'
$(cat "${HERE}/validate_restore.sh")
")" \
  --query 'Command.CommandId' --output text)

aws ssm wait command-executed --region "$REGION" \
  --command-id "$cmd_id" --instance-id "$INSTANCE_ID" 2>/dev/null || true

output=$(aws ssm get-command-invocation --region "$REGION" \
  --command-id "$cmd_id" --instance-id "$INSTANCE_ID" \
  --query 'StandardOutputContent' --output text)
status=$(aws ssm get-command-invocation --region "$REGION" \
  --command-id "$cmd_id" --instance-id "$INSTANCE_ID" \
  --query 'Status' --output text)

recovery_seconds=$(( $(date +%s) - recovery_started ))

# ----------------------------------------------------------------- 4. record

mkdir -p "$RESULTS_DIR"
result_file="${RESULTS_DIR}/${DRILL_ID}.json"

checks=$(printf '%s' "$output" | tail -1)
echo "$checks" | jq . >/dev/null 2>&1 || checks='{"ok":false,"error":"validator produced no JSON"}'

jq -n \
  --arg drill "$DRILL_ID" \
  --arg snapshot "$SNAPSHOT" \
  --arg snapshot_time "$snapshot_time" \
  --arg status "$status" \
  --argjson rto "$recovery_seconds" \
  --argjson checks "$checks" \
  '{drill_id:$drill, snapshot:$snapshot, snapshot_taken:$snapshot_time,
    ssm_status:$status, rto_seconds:$rto, checks:$checks,
    passed: ($status=="Success" and $checks.ok==true)}' |
  tee "$result_file"

passed=$(jq -r '.passed' "$result_file")
log "recovery time ${recovery_seconds}s, result ${passed}, written to ${result_file}"

[[ "$passed" == "true" ]]

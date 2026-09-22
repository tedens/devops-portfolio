#!/usr/bin/env bash
# Destroy a drill environment left behind by --keep or by a failed teardown,
# then confirm nothing is still running with real data in it.

set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_DIR="${HERE}/../terraform"
REGION="${AWS_REGION:-us-east-2}"

terraform -chdir="$TF_DIR" destroy -auto-approve -no-color \
  -var="rds_snapshot_id=unused" -var="db_credentials_secret_arn=unused" || true

echo "checking for anything left over..."
left=$(aws rds describe-db-instances --region "$REGION" \
  --query "DBInstances[?starts_with(DBInstanceIdentifier,'dr-sim')].DBInstanceIdentifier" \
  --output text)

if [[ -n "$left" ]]; then
  echo "STILL RUNNING: ${left}" >&2
  echo "A restored snapshot holds production data. Remove these before leaving." >&2
  exit 1
fi
echo "clean"

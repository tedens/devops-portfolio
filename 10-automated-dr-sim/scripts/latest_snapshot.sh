#!/usr/bin/env bash
# Resolve the most recent completed snapshot for a source database.
#
#   ./latest_snapshot.sh prod-db [region]
#
# Prints the snapshot identifier on stdout and nothing else, so it can be
# substituted straight into a terraform variable.

set -euo pipefail

SOURCE_DB="${1:?usage: latest_snapshot.sh <source-db-identifier> [region]}"
REGION="${2:-${AWS_REGION:-us-east-2}}"

# Automated and manual snapshots are separate lists in the API, so ask for
# both and take whichever is newer.
snapshot=$(
  aws rds describe-db-snapshots \
    --region "$REGION" \
    --db-instance-identifier "$SOURCE_DB" \
    --query 'DBSnapshots[?Status==`available`].[DBSnapshotIdentifier,SnapshotCreateTime]' \
    --output text |
    sort -k2 |
    tail -1 |
    cut -f1
)

if [[ -z "${snapshot}" ]]; then
  echo "No available snapshot found for ${SOURCE_DB} in ${REGION}" >&2
  exit 1
fi

echo "${snapshot}"

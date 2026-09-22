#!/usr/bin/env bash
# Prove that a restored snapshot actually holds usable data.
#
# Runs ON the validator host inside the recovery VPC, sent there by
# run_drill.sh via SSM. Standing the instance up only proves Terraform works;
# this is the part that proves the backup works.
#
# Environment:
#   DB_HOST, DB_PORT       restored endpoint
#   DB_SECRET_ARN          Secrets Manager ARN with {username,password}
#   DB_NAME                schema to inspect
#   CHECK_TABLES           space-separated tables that must exist and be non-empty
#   FRESHNESS_TABLE        table carrying a row timestamp, for the RPO figure
#   FRESHNESS_COLUMN       timestamp column in that table
#
# Emits a single JSON object on stdout. Exit status is non-zero if any check
# fails, so the drill fails loudly rather than reporting a green restore of an
# empty database.

set -euo pipefail

: "${DB_HOST:?}" "${DB_SECRET_ARN:?}" "${DB_NAME:?}"
DB_PORT="${DB_PORT:-3306}"
CHECK_TABLES="${CHECK_TABLES:-}"
FRESHNESS_TABLE="${FRESHNESS_TABLE:-}"
FRESHNESS_COLUMN="${FRESHNESS_COLUMN:-created_at}"

fail() {
  echo "{\"ok\":false,\"stage\":\"$1\",\"error\":\"$2\"}"
  exit 1
}

creds=$(aws secretsmanager get-secret-value \
  --secret-id "$DB_SECRET_ARN" \
  --query SecretString --output text) || fail credentials "could not read secret"

DB_USER=$(jq -r '.username' <<<"$creds")
DB_PASS=$(jq -r '.password' <<<"$creds")
unset creds

# Keep the password out of the process list and out of any command echo.
export MYSQL_PWD="$DB_PASS"
unset DB_PASS
mysql_q() { mysql --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USER" \
  --batch --skip-column-names --connect-timeout=10 -e "$1"; }

# 1. Connectivity. Also proves the credentials in the snapshot still work.
started=$(date +%s)
version=$(mysql_q "SELECT VERSION();") || fail connect "cannot connect to ${DB_HOST}"

# 2. The schema is present.
found=$(mysql_q "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='${DB_NAME}';")
[[ -n "$found" ]] || fail schema "database ${DB_NAME} is not in the restore"

# 3. Every table we were told to care about exists and has rows. A restore
#    that comes back structurally correct and empty is the failure mode this
#    whole project exists to catch.
declare -a counts=()
for t in $CHECK_TABLES; do
  exists=$(mysql_q "SELECT COUNT(*) FROM information_schema.TABLES
                    WHERE TABLE_SCHEMA='${DB_NAME}' AND TABLE_NAME='${t}';")
  [[ "$exists" == "1" ]] || fail tables "table ${t} missing from the restore"

  n=$(mysql_q "SELECT COUNT(*) FROM \`${DB_NAME}\`.\`${t}\`;")
  [[ "$n" -gt 0 ]] || fail tables "table ${t} restored but empty"
  counts+=("{\"table\":\"${t}\",\"rows\":${n}}")
done

# 4. How old is the data? This is the recovery point, measured rather than
#    assumed from the backup schedule.
rpo_seconds=null
newest=null
if [[ -n "$FRESHNESS_TABLE" ]]; then
  newest=$(mysql_q "SELECT UNIX_TIMESTAMP(MAX(\`${FRESHNESS_COLUMN}\`))
                    FROM \`${DB_NAME}\`.\`${FRESHNESS_TABLE}\`;") ||
    fail freshness "cannot read ${FRESHNESS_TABLE}.${FRESHNESS_COLUMN}"
  if [[ -n "$newest" && "$newest" != "NULL" ]]; then
    rpo_seconds=$(( $(date +%s) - newest ))
    newest="\"$(date -u -d "@${newest}" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null ||
                 date -u -r "${newest}" +%Y-%m-%dT%H:%M:%SZ)\""
  else
    newest=null
  fi
fi

# 5. Nothing is sitting in a crashed or read-only state.
bad=$(mysql_q "SELECT COUNT(*) FROM information_schema.TABLES
               WHERE TABLE_SCHEMA='${DB_NAME}' AND ENGINE IS NULL;")
[[ "$bad" == "0" ]] || fail integrity "${bad} tables have no engine, restore is damaged"

elapsed=$(( $(date +%s) - started ))

printf '{"ok":true,"engine_version":"%s","database":"%s","checks_seconds":%s,' \
  "$version" "$DB_NAME" "$elapsed"
printf '"newest_row":%s,"rpo_seconds":%s,"tables":[%s]}\n' \
  "$newest" "$rpo_seconds" "$(IFS=,; echo "${counts[*]:-}")"

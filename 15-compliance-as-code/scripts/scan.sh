#!/usr/bin/env bash
# Scan the repository's infrastructure and apply the baseline.
#
#   ./scripts/scan.sh                 human-readable, exits non-zero on a new
#                                     finding or an expired exception
#   ./scripts/scan.sh --json          machine-readable, for the evidence bundle
#   ./scripts/scan.sh --print-new     just the fingerprints, ready to paste
#                                     into baseline/accepted.json
#
# Two engines, on purpose. Trivy brings breadth: it knows more about AWS
# defaults than anyone should write by hand. The Rego in policy/ brings the
# rules this organisation has decided on, which no scanner ships with.
#
# The gate is a ratchet, not a wall. Everything currently failing is listed in
# baseline/accepted.json with an owner and an expiry, so the build stays green
# while the debt is visible and dated. A finding that is not listed fails the
# build. So does an exception whose expiry has passed.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${HERE}/../.." && pwd)"
POLICY="${HERE}/../policy/terraform"
BASELINE="${HERE}/../baseline/accepted.json"
TODAY="$(date -u +%Y-%m-%d)"
MODE="human"

case "${1:-}" in
  --json)      MODE="json" ;;
  --print-new) MODE="new" ;;
  "")          ;;
  *) echo "unknown argument: $1" >&2; exit 2 ;;
esac

# Directories holding infrastructure. Everything else in the repo is
# application code and is not this gate's business.
TARGETS=(
  03-iac-terraform
  05-aws-cost-optimization-toolkit
  06-secrets-rotation
  07-aws-multi-account-sso
  08-zero-trust-ssh
  09-karpenter-spot-nodes
  10-automated-dr-sim
)

findings="[]"

add() { findings=$(jq -c --argjson f "$1" '. + [$f]' <<<"$findings"); }

for d in "${TARGETS[@]}"; do
  [[ -d "${ROOT}/${d}" ]] || continue

  # --- org policy (Rego) -----------------------------------------------
  mapfile -t tf < <(find "${ROOT}/${d}" -name '*.tf' -not -path '*/.terraform/*')
  if ((${#tf[@]})); then
    raw=$(conftest test --parser hcl2 -p "$POLICY" --all-namespaces \
            --output json "${tf[@]}" 2>/dev/null || true)
    while IFS= read -r line; do
      [[ -z "$line" ]] && continue
      ns=$(jq -r '.ns' <<<"$line"); msg=$(jq -r '.msg' <<<"$line")
      sev=$(grep -oE '^(CRITICAL|HIGH|MEDIUM|LOW)' <<<"$msg" || echo MEDIUM)
      res=$(grep -oE '(aws_[a-z_]+\.[A-Za-z0-9_-]+|data\.aws_[a-z_]+\.[A-Za-z0-9_-]+)' <<<"$msg" | head -1)
      add "$(jq -nc --arg p "$d" --arg e policy --arg r "$ns" --arg res "${res:-unknown}" \
             --arg s "$sev" --arg m "$msg" \
             '{project:$p,engine:$e,rule:$r,resource:$res,severity:$s,message:$m,
               fingerprint:($p+"|"+$r+"|"+$res)}')"
    done < <(jq -c '.[] | . as $r | (.failures // [])[] | {ns:$r.namespace, msg:.msg}' <<<"${raw:-[]}" 2>/dev/null || true)
  fi

  # --- built-in checks (trivy) -----------------------------------------
  traw=$(trivy config --quiet --skip-version-check --format json \
           --severity CRITICAL,HIGH,MEDIUM "${ROOT}/${d}" 2>/dev/null || echo '{}')
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    add "$(jq -c --arg p "$d" '. + {project:$p, engine:"trivy",
            fingerprint:($p+"|"+.rule+"|"+.resource)}' <<<"$line")"
  done < <(jq -c '.Results[]? | select(.Misconfigurations) | . as $r | .Misconfigurations[]
                  | {rule:.ID,
                     resource:(if (.CauseMetadata.Resource // "") != "" then .CauseMetadata.Resource
                               else $r.Target end),
                     severity:.Severity, message:.Title}' <<<"$traw" 2>/dev/null || true)
done

# --- apply the baseline -------------------------------------------------

report=$(jq -n \
  --argjson f "$findings" \
  --slurpfile b "$BASELINE" \
  --arg today "$TODAY" '
  ($b[0].accepted // []) as $acc
  | ($acc | map({key: .fingerprint, value: .}) | from_entries) as $idx
  | {
      generated: $today,
      total: ($f | length),
      findings: ($f | map(
        . as $x
        | ($idx[$x.fingerprint] // null) as $a
        | . + {
            state: (
              if   $a == null        then "new"
              elif $a.expires < $today then "expired"
              else "accepted" end),
            exception: $a
          })),
      stale_exceptions: [
        ([$f[].fingerprint]) as $fps
        | $acc[]
        | . as $e
        | select(($fps | index($e.fingerprint)) == null)
        | $e.fingerprint
      ]
    }
  | . + {
      new:      [.findings[] | select(.state=="new")],
      expired:  [.findings[] | select(.state=="expired")],
      accepted: [.findings[] | select(.state=="accepted")]
    }')

case "$MODE" in
  json) echo "$report"; ;;
  new)  jq -r '.new[] | .fingerprint' <<<"$report"; ;;
  human)
    jq -r '
      "Scanned \(.total) findings across the repository.\n",
      "  new:      \(.new      | length)",
      "  expired:  \(.expired  | length)",
      "  accepted: \(.accepted | length)\n",
      (if (.new | length) > 0 then
        "NEW FINDINGS (these fail the build):",
        (.new[] | "  [\(.severity)] \(.project)  \(.rule)\n      \(.message)\n      fingerprint: \(.fingerprint)")
       else empty end),
      (if (.expired | length) > 0 then
        "\nEXPIRED EXCEPTIONS (accepted on \(.expired[0].exception.accepted), now overdue):",
        (.expired[] | "  [\(.severity)] \(.fingerprint)\n      owner: \(.exception.owner)  expired: \(.exception.expires)  ticket: \(.exception.ticket // "none")")
       else empty end),
      (if (.accepted | length) > 0 then
        "\nACCEPTED (tracked, not blocking):",
        (.accepted[] | "  [\(.severity)] \(.fingerprint)  expires \(.exception.expires)")
       else empty end),
      (if (.stale_exceptions | length) > 0 then
        "\nSTALE EXCEPTIONS (the finding is gone, tidy these up):",
        (.stale_exceptions[] | "  \(.)")
       else empty end)
    ' <<<"$report"
    ;;
esac

new_count=$(jq -r '.new | length' <<<"$report")
expired_count=$(jq -r '.expired | length' <<<"$report")

[[ "$new_count" == "0" && "$expired_count" == "0" ]]

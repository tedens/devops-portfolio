#!/usr/bin/env bash
# Produce a dated evidence bundle.
#
# An auditor does not want to watch a scan run. They want a file that says
# what was checked, when, against which commit, and what the result was, with
# the exceptions and who owns them. This writes that.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${HERE}/../.." && pwd)"
OUT="${HERE}/../evidence"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

mkdir -p "$OUT"

scan=$("${HERE}/scan.sh" --json) || true   # a failing gate is still evidence
controls=$(cat "${HERE}/../controls/controls.json")
policy_tests=$(cd "${HERE}/.." && opa test policy/ --format json 2>/dev/null || echo '[]')

jq -n \
  --arg stamp "$STAMP" \
  --arg commit "$(git -C "$ROOT" rev-parse HEAD 2>/dev/null || echo unknown)" \
  --arg branch "$(git -C "$ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)" \
  --arg trivy "$(trivy --version 2>/dev/null | head -1)" \
  --arg conftest "$(conftest --version 2>/dev/null | head -1)" \
  --arg opa "$(opa version 2>/dev/null | head -1)" \
  --argjson scan "$scan" \
  --argjson controls "$controls" \
  --argjson tests "$policy_tests" '
  {
    generated_at: $stamp,
    repository: { commit: $commit, branch: $branch },
    tooling: { trivy: $trivy, conftest: $conftest, opa: $opa },
    result: {
      total_findings: $scan.total,
      blocking:       ($scan.new | length),
      expired:        ($scan.expired | length),
      accepted:       ($scan.accepted | length),
      passed:         (($scan.new | length) == 0 and ($scan.expired | length) == 0)
    },
    policy_tests: {
      total:  ($tests | length),
      failed: ([$tests[] | select(.fail == true)] | length)
    },
    controls: {
      total:       ($controls.controls | length),
      implemented: ([$controls.controls[] | select(.status == "implemented")] | length),
      gaps:        [$controls.controls[] | select(.status != "implemented")
                     | {id, name, status, hipaa, soc2}]
    },
    exceptions: [ $scan.accepted[] | {
      fingerprint, severity,
      owner:    .exception.owner,
      expires:  .exception.expires,
      decision: .exception.decision,
      reason:   .exception.reason
    }],
    findings: $scan.findings
  }' > "${OUT}/${STAMP}.json"

echo "${OUT}/${STAMP}.json"
jq -r '
  "Evidence bundle \(.generated_at)",
  "  commit        \(.repository.commit[0:12]) on \(.repository.branch)",
  "  controls      \(.controls.implemented)/\(.controls.total) implemented",
  "  policy tests  \(.policy_tests.total - .policy_tests.failed)/\(.policy_tests.total) passing",
  "  findings      \(.result.total_findings) total, \(.result.blocking) blocking, \(.result.accepted) accepted",
  "  result        \(if .result.passed then "PASS" else "FAIL" end)"
' "${OUT}/${STAMP}.json"

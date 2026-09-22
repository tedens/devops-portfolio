#!/usr/bin/env bash
# Render the control matrix as markdown, for the project page and for anyone
# who asks "show me how you meet 164.312(b)".
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

jq -r '
  "| Control | Requirement | Implemented by | Verified by | Status |",
  "|---|---|---|---|---|",
  (.controls[] |
    "| **\(.id)** \(.name) | \((.hipaa // []) | join(", ")) / \((.soc2 // []) | join(", ")) " +
    "| \(.implemented_by | join("<br>")) | \(.verified_by | join("<br>")) | \(.status) |")
' "${HERE}/../controls/controls.json"

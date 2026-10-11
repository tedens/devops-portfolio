#!/usr/bin/env bash
# Copy the latest contact-free resume PDFs into the site and stamp the update date.
#
# Usage: scripts/sync-resume.sh [SOURCE_DIR]
#   SOURCE_DIR defaults to ~/projects, where the resume build writes
#   Anthony_Edens_Resume_2026.pdf (light) and Anthony_Edens_Resume_2026_dark.pdf.
#
# Refuses to publish a PDF that contains contact details. The repo is public,
# so anything copied here is in git history for good.
set -euo pipefail

here="$(cd "$(dirname "$0")/.." && pwd)"
src="${1:-$HOME/projects}"
assets="$here/docs/assets"
data="$here/docs/_data/resume.yml"

light_src="$src/Anthony_Edens_Resume_2026.pdf"
dark_src="$src/Anthony_Edens_Resume_2026_dark.pdf"
light_dst="$assets/Anthony_Edens_Resume.pdf"
dark_dst="$assets/Anthony_Edens_Resume_dark.pdf"

for f in "$light_src" "$dark_src"; do
  [[ -f "$f" ]] || { echo "missing: $f" >&2; exit 1; }
done

if ! command -v pdftotext >/dev/null; then
  echo "pdftotext not found (brew install poppler); refusing to copy unchecked PDFs" >&2
  exit 1
fi

# Anything that looks like a contact detail blocks the copy.
contact_re='@|Chicago|\+?1?[ (-]*[0-9]{3}[ )-]*[0-9]{3}-[0-9]{4}'
for f in "$light_src" "$dark_src"; do
  if pdftotext "$f" - | grep -Eq "$contact_re"; then
    echo "refusing: $f contains contact details; publish the contact-free build" >&2
    exit 1
  fi
done

cp "$light_src" "$light_dst"
cp "$dark_src" "$dark_dst"

today="$(date +%Y-%m-%d)"
sed -i.bak -E "s/^updated: \"[0-9-]+\"/updated: \"$today\"/" "$data" && rm -f "$data.bak"

echo "copied:"
echo "  $light_dst"
echo "  $dark_dst"
echo "stamped $data updated: $today"
echo "review with: git -C \"$here\" status"

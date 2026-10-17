#!/usr/bin/env bash
#
# HRT-397. Put development's Resend key in the two places that read them.
#
# Resend has no sandbox, so the separation is a key of its own in the same
# account. Send to delivered@resend.dev while testing: Resend accepts it and it
# never reaches a person. See docs/environments.md.
#
#   scripts/set-dev-resend.sh re_...
#
set -euo pipefail

key="${1:-}"

if [ -z "$key" ]; then
  echo "Usage: scripts/set-dev-resend.sh <api key>" >&2
  exit 1
fi

case "$key" in
  re_*) ;;
  *) echo "A Resend API key starts re_." >&2; exit 1 ;;
esac

root="$(cd "$(dirname "$0")/.." && pwd)"
file="$root/.env.local"

awk -v v="$key" '
  BEGIN { done = 0 }
  /^RESEND_API_KEY=/ { print "RESEND_API_KEY=" v; done = 1; next }
  { print }
  END { if (!done) print "RESEND_API_KEY=" v }
' "$file" > "$file.new"
mv "$file.new" "$file"
chmod 600 "$file"
echo "Written into .env.local."

cd "$root"
printf '%s' "$key" | vercel env add RESEND_API_KEY preview --force >/dev/null
echo "Set on Vercel Preview. Production was not touched."

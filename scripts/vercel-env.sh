#!/usr/bin/env zsh
#
# Copies the production environment from the repo's .env.local into the linked
# Vercel project. Run it from the repo root. Values are piped, never printed.
#
# PLATFORM_HOST and AUTH_COOKIE_DOMAIN are overridden here, because the local
# ones name localhost and the cookie has no domain locally.
set -e
cd "${0:a:h}/.."

[ -f .env.local ] || { echo ".env.local not found"; exit 1 }
[ -d .vercel ]    || { echo "run: vercel link"; exit 1 }

set -a; . ./.env.local; set +a
PLATFORM_HOST=connectapp.church
AUTH_COOKIE_DOMAIN=.connectapp.church

NAMES=(
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  SUPABASE_URL
  SUPABASE_PUBLISHABLE_KEY
  DATABASE_URL
  APP_DATABASE_URL
  NOTE_ENCRYPTION_KEY
  VAPID_PUBLIC_KEY
  VAPID_PRIVATE_KEY
  VAPID_SUBJECT
  STRIPE_SECRET_KEY
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  PLATFORM_HOST
  AUTH_COOKIE_DOMAIN
)

for k in $NAMES; do
  v="${(P)k}"
  if [ -z "$v" ]; then print -r -- "missing  $k"; continue; fi
  if printf '%s' "$v" | vercel env add "$k" production --force >/dev/null 2>&1; then
    print -r -- "set      $k"
  else
    print -r -- "FAILED   $k"
  fi
done

print -r -- ""
print -r -- "STRIPE_WEBHOOK_SECRET is not copied: the local one belongs to"
print -r -- "'stripe listen'. Create the endpoint, then set it:"
print -r -- "  stripe webhook_endpoints create \\"
print -r -- "    --url https://connectapp.church/api/stripe/webhook \\"
print -r -- "    --enabled-events '*'"

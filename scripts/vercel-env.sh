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

# Everything the running application reads. This list went stale once: the
# messaging work added PROVIDER_CREDENTIAL_KEY and the deployment never got it,
# so every church's sealed credential failed to open in production and the
# queue's worker answered 500 every five minutes while working locally. Add a
# name here in the same commit that first reads it.
#
# HEARTH_APP_PASSWORD and CONNECTAPP_APP_PASSWORD are deliberately absent: they
# create the database roles and are read by scripts/migrate.ts, never by a
# request.
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
  # R16.1, R21.15. Messaging: the key every church's own credential is sealed
  # with, and the client the Resend connection is made as.
  PROVIDER_CREDENTIAL_KEY
  RESEND_OAUTH_CLIENT_ID
  # R22.2. Signs the one-press DNS handover. Without it the screen shows the
  # three records to type, which is the right fallback rather than a failure.
  DOMAIN_CONNECT_PRIVATE_KEY
  DOMAIN_CONNECT_KEY_ID
  # R22.1. The support form. Resend carries it and this is the way back.
  SUPPORT_FROM_EMAIL
  SUPPORT_SMTP_USER
  SUPPORT_SMTP_APP_PASSWORD
  # R19.7. Signs the demo visitor's cookie. Falls back to NOTE_ENCRYPTION_KEY,
  # so a deployment without it works; named here so it stops being implicit.
  DEMO_PASS_SECRET
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

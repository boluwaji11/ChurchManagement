/**
 * HRT-405. The name of the portal's own session cookie.
 *
 * The portal and the product run on the same Supabase project in each
 * environment, so `@supabase/ssr` would name both sessions
 * `sb-<project-ref>-auth-token` by default. The product deliberately writes its
 * cookie on the parent domain, because every church reaches the product at a
 * name underneath it (`apps/web/lib/cookie-domain.ts`), and the portal is a
 * subdomain of that same parent. The browser therefore holds two different
 * cookies with one name on `admin.connectapp.church`: the portal's own,
 * host-only, and the product's, domain-wide.
 *
 * Both are sent on every request to the portal, and which one the client reads
 * is not defined. Reading the product's session returns a user who is not on
 * the platform team, or a token the other app has already rotated, so the gate
 * sends them to the door. It only happens to somebody signed in to both, which
 * is why it showed up in production and not in development.
 *
 * A name of its own removes the collision entirely. Nothing else about either
 * session changes, and the product keeps its domain-wide cookie.
 */
export const ADMIN_AUTH_COOKIE = "connectapp-admin-auth";

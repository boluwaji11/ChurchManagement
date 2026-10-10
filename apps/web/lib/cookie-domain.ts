/**
 * R1.4, R17.1. Which hosts the session cookie is sent to.
 *
 * Every church reaches the product at a name under ours, and a cookie left on
 * the exact host it was set on is a cookie the church's own address never
 * sees: somebody signed in at connectapp.church arrives at
 * riverside.connectapp.church as a stranger and is asked to sign in again.
 *
 * So it is set on the parent, where every church's name sits underneath it.
 * `AUTH_COOKIE_DOMAIN` says which, because the parent is a different name in
 * every environment and guessing it from the request is how a preview
 * deployment writes a cookie for a domain it does not own.
 *
 * Unset, nothing is added and the cookie stays on the host that set it, which
 * is the behaviour everything had before church addresses existed.
 */
export function cookieDomain(): string | undefined {
  const named = process.env["AUTH_COOKIE_DOMAIN"]?.trim();
  return named ? named : undefined;
}

/** The same options the caller asked for, carrying the domain where there is one. */
export function spanningSubdomains<T extends { domain?: string }>(options: T): T {
  const domain = cookieDomain();
  return domain ? { ...options, domain } : options;
}

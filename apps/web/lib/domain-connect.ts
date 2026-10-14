import "server-only";
import { createSign } from "node:crypto";
import type { PlannedRecord, Resolver } from "@connectapp/db";

/**
 * HRT-289, R22.2. One press instead of three settings typed by hand.
 *
 * Domain Connect is an open standard, and about twenty DNS companies answer
 * it. The church presses once, lands on its own DNS company's screen, approves
 * there, and the records are written. Nothing is pasted and nothing is typed.
 *
 * It only works where that company already holds our template, which is a
 * submission rather than a purchase, and the whole of what Entri sells for
 * $249 a month. So the domain is asked first and the press is offered only
 * where it would work. A church at a company that has never heard of us sees
 * the three settings and the right page to type them into, which is what every
 * church gets today.
 *
 * See docs/domain-connect.
 */

/** Ours, as the template names them. */
const PROVIDER_ID = "connectapp.church";
const SERVICE_ID = "email";

/** The record the public half of our signing key is published at. */
const KEY_ID = "_dck1";

const PATIENCE = 4000;

/**
 * R22.2. Which company answers for this domain, as the domain itself says.
 *
 * A DNS company that implements the standard answers at `_domainconnect`,
 * either with the name of its own endpoint or with a CNAME pointing at it.
 * Nothing here is a lookup of a list we keep: the domain is asked, so a church
 * that moved last week gets the right answer.
 */
export async function discover(domain: string, resolver: Resolver): Promise<string | null> {
  const at = `_domainconnect.${domain}`;

  const txt = await resolver.txt(at).catch(() => []);
  const named = txt.map((parts) => parts.join("").trim()).find(Boolean);
  if (named) return named.replace(/^https?:\/\//, "").replace(/\/+$/, "");

  const cname = await resolver.cname(at).catch(() => []);
  const pointed = cname[0]?.trim().replace(/\.$/, "");
  return pointed || null;
}

interface Settings {
  providerId: string;
  /** Where the church is sent to approve. */
  urlSyncUX: string;
  /** Where we ask whether our template is held. */
  urlAPI: string;
}

async function read(url: string): Promise<unknown | null> {
  try {
    const answer = await fetch(url, { signal: AbortSignal.timeout(PATIENCE), cache: "no-store" });
    return answer.ok ? await answer.json() : null;
  } catch {
    return null;
  }
}

/** R22.2. What that company says about this domain, in the standard's own shape. */
export async function settingsFor(host: string, domain: string): Promise<Settings | null> {
  const body = await read(`https://${host}/v2/${encodeURIComponent(domain)}/settings`);
  if (typeof body !== "object" || body === null) return null;

  const held = body as Record<string, unknown>;
  const sync = typeof held["urlSyncUX"] === "string" ? held["urlSyncUX"] : "";
  const api = typeof held["urlAPI"] === "string" ? held["urlAPI"] : "";
  const provider = typeof held["providerId"] === "string" ? held["providerId"] : "";

  /* A company that answers the settings and offers no screen to approve on
     only does the other flow, which is a different piece of work. */
  if (!sync || !api) return null;
  return { providerId: provider, urlSyncUX: sync, urlAPI: api };
}

/**
 * R22.2. Whether this company holds our template.
 *
 * The one question that decides whether the press exists. A company applies a
 * template it already has and refuses one it has never seen, so asking is the
 * difference between one press and a button that fails in front of a
 * volunteer.
 */
export async function holdsOurTemplate(urlAPI: string): Promise<boolean> {
  const at = `${urlAPI.replace(/\/+$/, "")}/v2/domainTemplates/providers/${PROVIDER_ID}/services/${SERVICE_ID}`;
  try {
    const answer = await fetch(at, { signal: AbortSignal.timeout(PATIENCE), cache: "no-store" });
    return answer.ok;
  } catch {
    return false;
  }
}

/** The private half of the signing key, kept out of the repository. */
const signingKey = (): string | null =>
  process.env["DOMAIN_CONNECT_PRIVATE_KEY"]?.replace(/\\n/g, "\n").trim() || null;

/**
 * R22.2. The three values our template asks for, out of the three records.
 *
 * The template writes the records with a fixed shape and the parts that differ
 * a church as variables, so what travels is the key and the two names rather
 * than the records themselves.
 */
export function variablesFrom(records: readonly PlannedRecord[]): Record<string, string> | null {
  const dkim = records.find((one) => one.type === "TXT")?.value ?? "";
  const rsend = records.find((one) => one.type === "CNAME" && one.host.startsWith("rsend"));
  const send = records.find((one) => one.type === "CNAME" && one.host.startsWith("send"));

  if (!dkim || !rsend?.value || !send?.value) return null;

  return {
    /* The template carries the `p=` itself, because a bare variable as a whole
       record value is what the standard asks us not to write. */
    dkim: dkim.replace(/^p=/, ""),
    rsendhost: rsend.value.replace(/\.$/, ""),
    sendhost: send.value.replace(/\.$/, ""),
  };
}

/**
 * R22.2. Where to send the church, signed so the company can tell it is us.
 *
 * The query is signed with the private half of a key whose public half sits on
 * our own domain at `_dck1`, so a DNS company can check that the request to
 * change somebody's records came from the service the template belongs to.
 * Unsigned, it is refused, which is the whole point of signing it.
 */
export function applyUrl(input: {
  urlSyncUX: string;
  domain: string;
  variables: Record<string, string>;
  /** Where the company sends the church back to. */
  redirectUri: string;
  state: string;
}): string | null {
  const key = signingKey();
  if (!key) return null;

  const query = new URLSearchParams({
    domain: input.domain,
    ...input.variables,
    redirect_uri: input.redirectUri,
    state: input.state,
  });

  let signature: string;
  try {
    const sign = createSign("RSA-SHA256");
    sign.update(query.toString());
    sign.end();
    signature = sign.sign(key, "base64");
  } catch {
    return null;
  }

  query.set("sig", signature);
  query.set("key", KEY_ID);

  const base = input.urlSyncUX.replace(/\/+$/, "");
  return `${base}/v2/domainTemplates/providers/${PROVIDER_ID}/services/${SERVICE_ID}/apply?${query.toString()}`;
}

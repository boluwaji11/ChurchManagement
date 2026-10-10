/**
 * HRT-283, R22.2. What we can tell a church about its own domain before it
 * changes anything.
 *
 * Linking a domain is the step a volunteer backs out of. They have been told
 * once, by somebody, that touching DNS breaks the church email, and they are
 * right to be careful: it does, and the person who did it is the person who
 * gets the phone calls.
 *
 * So the first screen is a reading rather than a form. We look up what is
 * already published, name it in words a volunteer recognises, and say exactly
 * which records we would add and which we would leave where they are. Nothing
 * here writes, asks for a password, or needs an account anywhere.
 *
 * Everything in this file is public DNS. It is what any mail server on the
 * internet reads before it delivers to them.
 */

/** What we would add, written the way a registrar's form asks for it. */
export interface PlannedRecord {
  type: "TXT" | "MX" | "CNAME";
  /** The host as a registrar asks for it, relative to the domain. */
  host: string;
  /** Filled in once the provider has generated it. */
  value: string | null;
  priority?: number;
  /** Why it is there, in one line. */
  purpose: "dkim" | "spf" | "returnPath";
}

export interface DomainWarning {
  /** A key in the catalogue, so the screen says it in the church's language. */
  code:
    | "noMx"
    | "manySpf"
    | "dkimTaken"
    | "dmarcStrict"
    | "lookupFailed";
  /** Whatever we read, for the line that quotes it back. */
  detail?: string;
}

export interface DomainFindings {
  domain: string;
  /** Who handles their incoming mail. Named where we know the host. */
  mailProvider: string | null;
  mailHosts: string[];
  /** Who answers for the domain, which is where the records get typed. */
  registrar: string | null;
  nameservers: string[];
  /** Their SPF record at the root, left exactly as it is. */
  spf: string | null;
  /** Their DMARC policy: "none", "quarantine" or "reject". */
  dmarc: string | null;
  /** Whether something already answers at the selector we would use. */
  dkimTaken: boolean;
  /** What we would add. */
  adding: PlannedRecord[];
  /** What we would leave exactly where it is. */
  leaving: string[];
  warnings: DomainWarning[];
}

/**
 * The mail hosts worth naming.
 *
 * Longest suffix first, because `outlook.com` and `protection.outlook.com` both
 * match a Microsoft host and only one of them is the useful answer.
 */
const MAIL_HOSTS: ReadonlyArray<readonly [string, string]> = [
  ["protection.outlook.com", "Microsoft 365"],
  ["mail.protection.outlook.com", "Microsoft 365"],
  ["googlemail.com", "Google Workspace"],
  ["google.com", "Google Workspace"],
  ["zoho.com", "Zoho Mail"],
  ["zoho.eu", "Zoho Mail"],
  ["icloud.com", "iCloud Mail"],
  ["messagingengine.com", "Fastmail"],
  ["fastmail.com", "Fastmail"],
  ["protonmail.ch", "Proton Mail"],
  ["proton.me", "Proton Mail"],
  ["improvmx.com", "ImprovMX"],
  ["migadu.com", "Migadu"],
  ["mailgun.org", "Mailgun"],
  ["titan.email", "Titan"],
  ["privateemail.com", "Namecheap Private Email"],
  ["yandex.net", "Yandex Mail"],
  ["secureserver.net", "GoDaddy Email"],
  ["mailanyone.net", "Mailanyone"],
  ["emailsrvr.com", "Rackspace Email"],
];

/** The nameservers worth naming, because that is where somebody has to log in. */
const NAME_HOSTS: ReadonlyArray<readonly [string, string]> = [
  ["domaincontrol.com", "GoDaddy"],
  ["godaddy.com", "GoDaddy"],
  ["wixdns.net", "Wix"],
  ["squarespacedns.com", "Squarespace"],
  ["cloudflare.com", "Cloudflare"],
  ["registrar-servers.com", "Namecheap"],
  ["name.com", "Name.com"],
  ["awsdns", "Amazon Route 53"],
  ["dnsimple.com", "DNSimple"],
  ["digitalocean.com", "DigitalOcean"],
  ["vercel-dns.com", "Vercel"],
  ["netlify.com", "Netlify"],
  ["bluehost.com", "Bluehost"],
  ["hostgator.com", "HostGator"],
  ["siteground.net", "SiteGround"],
  ["ionos.com", "IONOS"],
  ["gandi.net", "Gandi"],
  ["hover.com", "Hover"],
  ["dreamhost.com", "DreamHost"],
  ["weebly.com", "Weebly"],
  ["shopify.com", "Shopify"],
  ["nsone.net", "NS1"],
];

const named = (
  hosts: readonly string[],
  table: ReadonlyArray<readonly [string, string]>,
): string | null => {
  const lower = hosts.map((one) => one.toLowerCase().replace(/\.$/, ""));
  // Longest match wins, so a more specific host beats the general one.
  let best: readonly [string, string] | null = null;
  for (const entry of table) {
    if (!lower.some((host) => host === entry[0] || host.endsWith(`.${entry[0]}`) || host.includes(entry[0]))) {
      continue;
    }
    if (!best || entry[0].length > best[0].length) best = entry;
  }
  return best?.[1] ?? null;
};

/** R22.2. Whose mail server answers for this domain. */
export const mailProviderOf = (mxHosts: readonly string[]): string | null =>
  named(mxHosts, MAIL_HOSTS);

/** R22.2. Where somebody has to log in to type a record. */
export const registrarOf = (nameservers: readonly string[]): string | null =>
  named(nameservers, NAME_HOSTS);

/** An SPF record is a TXT record starting `v=spf1`. Others are not SPF. */
export const spfRecords = (txt: readonly string[]): string[] =>
  txt.filter((one) => one.trim().toLowerCase().startsWith("v=spf1"));

/** The policy letter out of a DMARC record, where there is one. */
export function dmarcPolicy(txt: readonly string[]): string | null {
  const record = txt.find((one) => one.trim().toLowerCase().startsWith("v=dmarc1"));
  if (!record) return null;
  const found = /[;\s]p\s*=\s*(none|quarantine|reject)/i.exec(record);
  return found?.[1]?.toLowerCase() ?? null;
}

/**
 * R22.2, R16.1. The three records a sending domain needs, and no others.
 *
 * The DKIM key goes at the root, so mail leaves as `sarah@gracecommunity.org`
 * with the signature aligned to the address a member reads. The SPF record and
 * the return path that carries bounces go on a `send.` subdomain of their own,
 * which is why the church's existing mail keeps working: their root MX, the one
 * pointing at Google or Microsoft, is never in the picture, and their root SPF
 * record is never touched.
 *
 * The values arrive from the provider once the domain is registered with it.
 * Until then the shape is what the church is shown, because the shape is what
 * answers "what are you going to do to my domain".
 */
export function plannedRecords(domain: string): PlannedRecord[] {
  return [
    { type: "TXT", host: `resend._domainkey.${domain}`, value: null, purpose: "dkim" },
    { type: "TXT", host: `send.${domain}`, value: null, purpose: "spf" },
    { type: "MX", host: `send.${domain}`, value: null, priority: 10, purpose: "returnPath" },
  ];
}

/** What a reader needs told before they press anything. */
export function warningsFor(findings: {
  mailHosts: readonly string[];
  spfCount: number;
  dkimTaken: boolean;
  dmarc: string | null;
}): DomainWarning[] {
  const out: DomainWarning[] = [];

  // Nothing receives mail here. Worth saying, because it usually means the
  // address they gave us is the wrong one.
  if (findings.mailHosts.length === 0) out.push({ code: "noMx" });

  // Two SPF records is already broken, and it is broken for their existing
  // mail rather than for anything we are about to do. They should know.
  if (findings.spfCount > 1) out.push({ code: "manySpf" });

  // Something already answers where our key goes. Overwriting it would stop
  // whatever put it there from sending.
  if (findings.dkimTaken) out.push({ code: "dkimTaken" });

  // A strict policy is a good thing and a thing to mention, because it is why
  // the key goes at the root rather than on a subdomain.
  if (findings.dmarc === "reject" || findings.dmarc === "quarantine") {
    out.push({ code: "dmarcStrict", detail: findings.dmarc });
  }

  return out;
}

/** What the lookup needs to be able to do, so a test can answer without a network. */
export interface Resolver {
  mx(host: string): Promise<{ exchange: string; priority: number }[]>;
  txt(host: string): Promise<string[][]>;
  ns(host: string): Promise<string[]>;
}

/** A hostname, lowercased, with any scheme, path or trailing dot taken off. */
export function bareDomain(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  const withoutScheme = trimmed.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  const host = withoutScheme.split("/")[0]!.split("?")[0]!.split("#")[0]!
    .replace(/\.$/, "")
    .replace(/^www\./, "");
  // A domain is labels joined by dots, and it has at least two of them.
  return /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(host)
    ? host
    : null;
}

/**
 * R22.2. Read the domain and say what we found.
 *
 * Every lookup is allowed to fail on its own. A domain with no DMARC record
 * answers with an error, and so does a domain that does not exist, and the
 * difference between them is not worth refusing the whole reading over.
 */
export async function readDomain(
  raw: string,
  resolver: Resolver,
): Promise<DomainFindings | null> {
  const domain = bareDomain(raw);
  if (!domain) return null;

  const quiet = async <T>(work: Promise<T>, fallback: T): Promise<T> => {
    try {
      return await work;
    } catch {
      return fallback;
    }
  };

  const [mx, rootTxt, dmarcTxt, dkimTxt, ns] = await Promise.all([
    quiet(resolver.mx(domain), []),
    quiet(resolver.txt(domain), []),
    quiet(resolver.txt(`_dmarc.${domain}`), []),
    quiet(resolver.txt(`resend._domainkey.${domain}`), []),
    quiet(resolver.ns(domain), []),
  ]);

  // A TXT record arrives in pieces, because a record longer than 255
  // characters is published as several strings. Joined with nothing between
  // them, which is what every mail server does with it.
  const flat = (chunks: string[][]): string[] => chunks.map((parts) => parts.join(""));

  const mailHosts = mx
    .slice()
    .sort((a, b) => a.priority - b.priority)
    .map((one) => one.exchange.replace(/\.$/, ""));
  const spf = spfRecords(flat(rootTxt));
  const dmarc = dmarcPolicy(flat(dmarcTxt));
  const dkimTaken = flat(dkimTxt).length > 0;

  return {
    domain,
    mailProvider: mailProviderOf(mailHosts),
    mailHosts,
    registrar: registrarOf(ns),
    nameservers: ns.map((one) => one.replace(/\.$/, "")),
    spf: spf[0] ?? null,
    dmarc,
    dkimTaken,
    adding: plannedRecords(domain),
    leaving: [
      ...(mailHosts.length > 0 ? ["mx"] : []),
      ...(spf.length > 0 ? ["spf"] : []),
      ...(dmarc ? ["dmarc"] : []),
    ],
    warnings: warningsFor({ mailHosts, spfCount: spf.length, dkimTaken, dmarc }),
  };
}

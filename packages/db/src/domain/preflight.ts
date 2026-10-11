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
  /**
   * R1.1. Whether this name already points at us.
   *
   * The one question the church's own address screen has to answer: has the
   * thing we asked them to do been done. Null when we were not told what to
   * look for.
   */
  pointsHere: boolean | null;
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
 * The DKIM key goes at the root, so mail leaves as `sarah@fairviewchurch.org`
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

  /*
   * A strict DMARC policy used to be listed here. It is good news, and a
   * warning that reports good news teaches a reader to skim warnings. What
   * the policy is already has a row of its own in the reading.
   */

  return out;
}

/** What the lookup needs to be able to do, so a test can answer without a network. */
export interface Resolver {
  mx(host: string): Promise<{ exchange: string; priority: number }[]>;
  txt(host: string): Promise<string[][]>;
  ns(host: string): Promise<string[]>;
  /** R1.1. Where this exact name is pointed, if anywhere. */
  cname(host: string): Promise<string[]>;
}

/**
 * R1.1. Whether this name is pointed at us.
 *
 * Compared on the host alone. A church's provider writes the target with a
 * trailing dot, and the host we hand in can carry a port while we are working
 * on a laptop, and neither of those is a different answer.
 */
export function aimedAt(targets: readonly string[], expect: string): boolean {
  const want = expect.trim().toLowerCase().split(":")[0]!.replace(/\.$/, "");
  if (!want) return false;
  return targets.some((one) => one.trim().toLowerCase().replace(/\.$/, "") === want);
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
  /** Our own host, so the reading can say whether the name reaches us yet. */
  expect?: string,
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

  /*
   * How the church's mail is set up is a fact about the domain itself, so it
   * is read there. Where this name points is a fact about this name, so that
   * is read here.
   */
  const apex = apexOf(domain);

  const [mx, rootTxt, dmarcTxt, dkimTxt, ns, cname, wildTxt] = await Promise.all([
    quiet(resolver.mx(apex), []),
    quiet(resolver.txt(apex), []),
    quiet(resolver.txt(`_dmarc.${apex}`), []),
    quiet(resolver.txt(`resend._domainkey.${apex}`), []),
    quiet(resolver.ns(apex), []),
    quiet(resolver.cname(domain), []),
    /*
     * A name nobody would ever create, so whatever answers it is a wildcard
     * answering for everything. A domain with `* TXT` replies to every lookup
     * under it, and without this the DKIM check reads that reply as a record
     * somebody put there deliberately and warns about a conflict that is not
     * there.
     */
    quiet(resolver.txt(`_connectapp-wildcard-probe.${apex}`), []),
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
  const atDkim = flat(dkimTxt);
  const wildcard = flat(wildTxt);
  const fromWildcard =
    wildcard.length > 0 && atDkim.every((one) => wildcard.includes(one));
  const dkimTaken = atDkim.length > 0 && !fromWildcard;

  return {
    domain,
    mailProvider: mailProviderOf(mailHosts),
    mailHosts,
    registrar: registrarOf(ns),
    nameservers: ns.map((one) => one.replace(/\.$/, "")),
    spf: spf[0] ?? null,
    dmarc,
    dkimTaken,
    pointsHere: expect ? aimedAt(cname, expect) : null,
    adding: plannedRecords(apex),
    leaving: [
      ...(mailHosts.length > 0 ? ["mx"] : []),
      ...(spf.length > 0 ? ["spf"] : []),
      ...(dmarc ? ["dmarc"] : []),
    ],
    warnings: warningsFor({ mailHosts, spfCount: spf.length, dkimTaken, dmarc }),
  };
}

/**
 * R22.2. Where a church goes to add the record, by name.
 *
 * We already read their nameservers to name the provider, and naming it
 * without taking them there is the half of the job that helps nobody. A
 * volunteer who has been told "add a CNAME at your domain provider" is a
 * volunteer looking at a search engine.
 *
 * The deep link is to the provider's own domain list rather than to one
 * domain's records, because the path to a single domain carries an account id
 * we do not have.
 */
/**
 * R9.5. The site builders a church's nameservers give away.
 *
 * Only some do. A church on Wix or Squarespace usually points the whole name
 * at them, and then the nameservers say so outright. A church that bought at
 * GoDaddy and built on anything says nothing here, which is why this is a
 * guess the church confirms rather than an answer.
 */
const BUILDER_NS: [string, string][] = [
  ["wixdns.net", "wix"],
  ["squarespacedns.com", "squarespace"],
  ["wordpress.com", "wordpress"],
  ["weebly.com", "weebly"],
  ["webflow.com", "webflow"],
  ["shopifydns.com", "shopify"],
  ["myshopify.com", "shopify"],
  ["godaddysites.com", "godaddy"],
];

/** The builder a set of nameservers names, or null when they name none. */
export function builderFromNameservers(nameservers: readonly string[]): string | null {
  const names = nameservers.map((one) => one.toLowerCase().replace(/\.$/, ""));
  for (const [suffix, builder] of BUILDER_NS) {
    if (names.some((one) => one === suffix || one.endsWith(`.${suffix}`))) return builder;
  }
  return null;
}

/**
 * R9.5. Every builder the steps are written for.
 *
 * Ids rather than names, because the name is a word on a screen and belongs in
 * the catalogue with every other word. "other" is last and is what a church
 * with a hand-written site picks.
 */
export const SITE_BUILDERS = [
  "wix",
  "squarespace",
  "wordpress",
  "weebly",
  "webflow",
  "godaddy",
  "shopify",
  "code",
  "other",
] as const;

export type SiteBuilder = (typeof SITE_BUILDERS)[number];

export const DNS_CONSOLE: Record<string, string> = {
  "GoDaddy": "https://dcc.godaddy.com/control/portfolio",
  "Cloudflare": "https://dash.cloudflare.com/",
  "Namecheap": "https://ap.www.namecheap.com/domains/list/",
  "Squarespace": "https://account.squarespace.com/domains",
  "Wix": "https://www.wix.com/my-account/domains",
  "Amazon Route 53": "https://console.aws.amazon.com/route53/v2/hostedzones",
  "Name.com": "https://www.name.com/account/domain",
  "DNSimple": "https://dnsimple.com/a/domains",
  "DigitalOcean": "https://cloud.digitalocean.com/networking/domains",
  "Vercel": "https://vercel.com/dashboard/domains",
  "Netlify": "https://app.netlify.com/teams/overview/dns",
  "IONOS": "https://my.ionos.com/domains",
  "Gandi": "https://admin.gandi.net/domain",
  "Hover": "https://www.hover.com/control_panel/domains",
  "DreamHost": "https://panel.dreamhost.com/index.cgi?tree=domain.manage",
  "Bluehost": "https://my.bluehost.com/domains",
  "HostGator": "https://portal.hostgator.com/domains",
  "SiteGround": "https://my.siteground.com/",
  "Shopify": "https://admin.shopify.com/settings/domains",
  "Weebly": "https://www.weebly.com/app/account/domains",
  "NS1": "https://my.nsone.net/#/zones",
};

/** The console for whoever answers for this domain, where we know it. */
export const consoleFor = (registrar: string | null | undefined): string | null =>
  (registrar && DNS_CONSOLE[registrar]) ?? null;

/**
 * R1.1. Suffixes that take a label of their own before the name begins.
 *
 * `church.co.uk` is an apex the same way `church.org` is, and counting dots
 * would call it a subdomain and hand a church a record that breaks their mail.
 */
const TWO_PART_SUFFIXES = [
  "co.uk", "org.uk", "ac.uk", "gov.uk", "me.uk", "net.uk", "sch.uk",
  "com.au", "net.au", "org.au", "edu.au", "gov.au",
  "co.nz", "org.nz", "net.nz", "govt.nz",
  "co.za", "org.za", "net.za",
  "com.br", "com.mx", "com.ar", "com.sg", "com.my", "com.ph", "com.ng",
  "co.in", "org.in", "net.in", "co.ke", "or.ke", "com.gh",
];

/**
 * R1.1. Whether this is the church's domain itself rather than a name under it.
 *
 * It decides what we are allowed to tell them to do. A CNAME cannot sit on the
 * domain itself: the standard forbids it alongside the other records a domain
 * carries, every provider refuses it, and a provider that quietly accepted it
 * would take their email down with it. So an apex gets a different answer.
 */
export function isApex(domain: string): boolean {
  const name = domain.toLowerCase();
  const labels = name.split(".");
  // Three labels is an apex only when the last two are a suffix of their own.
  if (TWO_PART_SUFFIXES.some((suffix) => name.endsWith(`.${suffix}`))) {
    return labels.length <= 3;
  }
  return labels.length <= 2;
}

/** The part a provider's "Name" box wants, which is the name without the domain. */
export function hostLabel(domain: string): string {
  const labels = domain.toLowerCase().split(".");
  const apexLabels = TWO_PART_SUFFIXES.some((suffix) => domain.toLowerCase().endsWith(`.${suffix}`))
    ? 3
    : 2;
  return labels.length <= apexLabels ? "@" : labels.slice(0, labels.length - apexLabels).join(".");
}

/**
 * R1.1. The domain itself, from any name underneath it.
 *
 * Everything a church's mail is set up with lives here rather than on a name
 * under it: the mail servers, the sender list, the forgery policy, and the
 * nameservers that tell us who their provider is. Reading those against
 * `members.grace.org` finds nothing at all, which is how a church that is
 * plainly at GoDaddy came back with no provider named.
 */
export function apexOf(domain: string): string {
  const name = domain.toLowerCase();
  const labels = name.split(".");
  const keep = TWO_PART_SUFFIXES.some((suffix) => name.endsWith(`.${suffix}`)) ? 3 : 2;
  return labels.length <= keep ? name : labels.slice(labels.length - keep).join(".");
}

/** A name under the church's own domain, for an apex we cannot point here. */
export function suggestSubdomain(domain: string, label = "members"): string {
  return `${label}.${domain}`;
}

/**
 * HRT-377, R22.2. The shape of a church's website.
 *
 * One document per church, held as jsonb: a theme, a shared header and footer,
 * and an ordered list of pages, each an ordered list of sections. The editor
 * works on a draft copy of it, publishing copies the draft over the live one,
 * and the published page is rendered from the live one. Nothing here touches
 * the database and nothing here renders: it is the shape, its defaults and the
 * guard that every write passes through, so the browser and the server agree on
 * what a website is.
 *
 * Why a document rather than rows. A section's content differs by kind: a
 * service times band holds nothing but a heading, a leadership row holds a
 * person per card, a gallery holds twelve pictures. Rows for that end as thirty
 * nullable columns, and a new kind of section becomes a migration. A document
 * carries its own version instead, and `readDoc` brings an older one forward.
 *
 * Why it is safe. No field anywhere holds markup. Text is plain text, or a list
 * of runs carrying nothing but bold, italic and a link. A link is a named
 * destination resolved at render time, so the only free-form address a church
 * can write is checked here and has to be https. A picture is either a stored
 * key we own or an https address. There is no path from this document to
 * innerHTML.
 */

import { InvalidInputError } from "../errors";

/** The version this file writes. `readDoc` brings anything older forward. */
export const SITE_DOC_VERSION = 1;

/* ------------------------------------------------------------------ text --- */

/**
 * A stretch of text carrying at most bold, italic and a link.
 *
 * The editor types into a contentEditable and hands back runs, which is why
 * this exists rather than a string of HTML. Rendering a run is a `<span>`, an
 * `<em>`, a `<strong>` or an `<a>`, so there is nothing a church can write here
 * that reaches the browser as markup.
 */
export interface Run {
  t: string;
  b?: true;
  i?: true;
  /** Resolved and checked the same way a button's destination is. */
  href?: LinkTarget;
}

export type Rich = Run[];

/** Where a button, a link or a run of text goes. */
export type LinkTarget =
  | { kind: "none" }
  /** Another page of this website. */
  | { kind: "page"; pageId: string }
  /** Somewhere else on the internet. Checked: https, no credentials. */
  | { kind: "url"; url: string }
  /** This church's giving page, which the platform already serves. */
  | { kind: "give" }
  /** This church's what's-on page. */
  | { kind: "events" }
  /** This church's group finder. */
  | { kind: "groups" }
  /** One published form of this church's, by the address it answers on. */
  | { kind: "form"; formSlug: string }
  /** The door into the church's own portal. */
  | { kind: "join" }
  | { kind: "signIn" }
  /** The church's own address or telephone, as held on its record. */
  | { kind: "email" }
  | { kind: "phone" }
  /** A map of the church's address. */
  | { kind: "map" }
  /** Further down this page. */
  | { kind: "anchor"; sectionId: string };

export interface SiteLink {
  label: string;
  to: LinkTarget;
  /** Which of the theme's two button languages it speaks. */
  tone?: "primary" | "secondary" | "quiet";
}

export interface SiteImage {
  /** A stored object of ours, under the `website_media` purpose. */
  key: string | null;
  /** An https address, for a church whose photographs live elsewhere. */
  url: string | null;
  alt: string;
  /** Where the middle of the picture is, 0 to 1 on each axis. */
  focus?: { x: number; y: number };
  fit?: "cover" | "contain";
}

/* ----------------------------------------------------------------- theme --- */

export const SITE_PALETTES = [
  "stone", "forest", "ivory", "dusk", "clay", "harbour", "sand", "slate",
] as const;
export type PaletteKey = (typeof SITE_PALETTES)[number];

export const SITE_PAIRINGS = [
  "editorial", "geometric", "classical", "humanist", "grotesque", "literary",
] as const;
export type PairingKey = (typeof SITE_PAIRINGS)[number];

export const SITE_COLOR_TOKENS = [
  "bg", "surface", "ink", "muted", "line", "primary", "primaryInk", "accent",
] as const;
export type SiteColorToken = (typeof SITE_COLOR_TOKENS)[number];

export interface SiteTheme {
  palette: PaletteKey;
  /** What the church has changed by hand, over the palette. */
  colors: Partial<Record<SiteColorToken, string>>;
  fonts: PairingKey;
  /** How large everything is set, against the pairing's own scale. */
  typeScale: "compact" | "regular" | "grand";
  headingWeight: "light" | "regular" | "medium" | "bold";
  corners: "square" | "soft" | "round";
  buttons: { shape: "square" | "soft" | "pill"; secondary: "outline" | "soft" | "quiet" };
  width: "narrow" | "regular" | "wide";
  rhythm: "compact" | "regular" | "airy";
  /** A card's edge: a line, a shadow, or neither. */
  cards: "line" | "shadow" | "flat";
  images: "square" | "soft" | "round";
}

/* ---------------------------------------------------- header and footer --- */

export interface SiteHeader {
  style: "logoLeft" | "centred" | "minimal" | "stacked";
  /** Sits over the hero with no background of its own, until the page scrolls. */
  transparent: boolean
  sticky: boolean;
  logo: SiteImage | null;
  /** Shown beside the logo, or on its own when there is no logo. */
  showName: boolean;
  action: SiteLink | null;
}

export interface SiteFooter {
  style: "columns" | "simple" | "band";
  showAddress: boolean;
  showContact: boolean;
  showTimes: boolean;
  showSocial: boolean;
  blurb: Rich;
  links: SiteLink[];
}

export interface SiteSocial {
  facebook?: string;
  instagram?: string;
  youtube?: string;
  x?: string;
  tiktok?: string;
  spotify?: string;
}

/* -------------------------------------------------------------- sections --- */

/**
 * What a section reads from the church instead of from its own content.
 *
 * A church either keeps its service times up to date in one place and has the
 * website follow, or writes them on the page by hand. Both are honest answers
 * and the section says which it is doing. Nothing bound here is private: each
 * one resolves through a reader the platform already uses for its own public
 * pages, which is where the allowlist lives.
 */
export type SiteBinding =
  | { source: "manual" }
  | { source: "serviceTimes" }
  | { source: "events"; limit: number }
  | { source: "groups"; limit: number; typeIds?: string[] }
  | { source: "funds" }
  | { source: "form"; formSlug: string };

export interface SectionStyle {
  /** Which of the theme's grounds it sits on. */
  ground?: "page" | "surface" | "primary" | "accent" | "ink" | "image";
  /** Only read when the ground is a picture. */
  background?: SiteImage | null;
  /** How dark the wash over a background picture is, 0 to 90. */
  overlay?: number;
  pad?: "none" | "compact" | "regular" | "generous";
  align?: "left" | "centre";
  /** Off the page on a telephone, or off it on a desk. */
  hideOn?: "phone" | "desk";
}

export interface SiteSection {
  id: string;
  type: string;
  variant: string;
  /** Kept in the document and off the page, so a church can put it back. */
  hidden?: boolean;
  bind?: SiteBinding;
  style?: SectionStyle;
  /** Checked against the kind's own rules in `site-sections.ts`. */
  content: Record<string, unknown>;
}

/* ----------------------------------------------------------------- pages --- */

export interface SitePageSeo {
  title?: string;
  description?: string;
  image?: SiteImage | null;
  /** Kept out of search engines, still reachable by anybody with the address. */
  noIndex?: boolean;
}

export interface SitePage {
  id: string;
  title: string;
  /** Empty for the home page, which is the church's own address. */
  slug: string;
  inNav: boolean;
  seo: SitePageSeo;
  sections: SiteSection[];
}

export interface SiteDoc {
  v: number;
  template: string;
  theme: SiteTheme;
  header: SiteHeader;
  footer: SiteFooter;
  social: SiteSocial;
  pages: SitePage[];
  /** The id of the page served at the church's own address. */
  homeId: string;
  seo: { description?: string; image?: SiteImage | null; noIndex?: boolean };
}

/* ------------------------------------------------------------- the guard --- */

const ID = /^[A-Za-z0-9_-]{1,64}$/;
/** A page's address. Lower case, no slashes, so it cannot climb out. */
const SLUG = /^[a-z0-9][a-z0-9-]{0,62}$/;
const MEDIA_KEY = /^[a-z0-9-]+\/website_media\/[a-f0-9-]+\.(?:png|jpg|webp|mp4|webm)$/;

/**
 * Addresses a page may not take, because the platform already answers them.
 *
 * A church that names a page "give" would otherwise write a page nobody can
 * reach, and spend an afternoon finding out why.
 */
export const RESERVED_SLUGS = new Set([
  "api", "auth", "sign-in", "sign-up", "join", "reset", "forgot", "give",
  "giving", "import", "demo", "design", "offline", "trust", "serving", "u",
  "g", "f", "e", "tags", "fields", "choose-church", "create-church", "website",
  "site-media", "sitemap.xml", "robots.txt", "manifest.webmanifest", "settings",
  "dashboard", "members", "groups", "events", "forms", "services", "schedule",
  "messages", "calendar", "checkin", "reports", "followups", "incidents", "home",
]);

const bad = (): never => { throw new InvalidInputError("website.error.document"); };

const str = (value: unknown, max: number): string => {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string" || value.length > max) bad();
  return (value as string).trim();
};

const bool = (value: unknown, fallback = false): boolean =>
  typeof value === "boolean" ? value : fallback;

const pick = <T extends string>(
  value: unknown, allowed: readonly T[], fallback: T,
): T => (typeof value === "string" && (allowed as readonly string[]).includes(value)
  ? value as T
  : fallback);

const num = (value: unknown, low: number, high: number, fallback: number): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(high, Math.max(low, value));
};

/** An address a church typed. https only, and nothing carrying credentials. */
export function cleanSiteUrl(value: unknown): string {
  const raw = str(value, 2048);
  if (!raw) bad();
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return bad();
  }
  if (url.protocol !== "https:" || url.username || url.password) bad();
  return url.toString();
}

export function cleanLinkTarget(value: unknown): LinkTarget {
  if (!value || typeof value !== "object") return { kind: "none" };
  const one = value as Record<string, unknown>;
  switch (one["kind"]) {
    case "page": {
      const pageId = str(one["pageId"], 64);
      return ID.test(pageId) ? { kind: "page", pageId } : { kind: "none" };
    }
    case "url":
      return { kind: "url", url: cleanSiteUrl(one["url"]) };
    case "form": {
      const formSlug = str(one["formSlug"], 64).toLowerCase();
      return SLUG.test(formSlug) ? { kind: "form", formSlug } : { kind: "none" };
    }
    case "anchor": {
      const sectionId = str(one["sectionId"], 64);
      return ID.test(sectionId) ? { kind: "anchor", sectionId } : { kind: "none" };
    }
    case "give": return { kind: "give" };
    case "events": return { kind: "events" };
    case "groups": return { kind: "groups" };
    case "join": return { kind: "join" };
    case "signIn": return { kind: "signIn" };
    case "email": return { kind: "email" };
    case "phone": return { kind: "phone" };
    case "map": return { kind: "map" };
    default: return { kind: "none" };
  }
}

export function cleanRich(value: unknown, maxRuns = 200): Rich {
  if (value === undefined || value === null) return [];
  /* A church that had plain text here before, and the editor's own shorthand. */
  if (typeof value === "string") return value ? [{ t: str(value, 6000) }] : [];
  if (!Array.isArray(value) || value.length > maxRuns) bad();
  const given = value as unknown[];
  const runs: Rich = [];
  let total = 0;
  for (const item of given) {
    if (!item || typeof item !== "object") bad();
    const one = item as Record<string, unknown>;
    const text = typeof one["t"] === "string" ? one["t"] : bad();
    total += text.length;
    if (total > 6000) bad();
    const run: Run = { t: text };
    if (one["b"] === true) run.b = true;
    if (one["i"] === true) run.i = true;
    if (one["href"] !== undefined && one["href"] !== null) {
      const to = cleanLinkTarget(one["href"]);
      if (to.kind !== "none") run.href = to;
    }
    runs.push(run);
  }
  return runs;
}

export function cleanImage(value: unknown): SiteImage | null {
  if (!value || typeof value !== "object") return null;
  const one = value as Record<string, unknown>;
  const key = str(one["key"], 300) || null;
  if (key && !MEDIA_KEY.test(key)) bad();
  const url = key ? null : (one["url"] ? cleanSiteUrl(one["url"]) : null);
  if (!key && !url) return null;
  const focus = one["focus"] && typeof one["focus"] === "object"
    ? {
        x: num((one["focus"] as Record<string, unknown>)["x"], 0, 1, 0.5),
        y: num((one["focus"] as Record<string, unknown>)["y"], 0, 1, 0.5),
      }
    : { x: 0.5, y: 0.5 };
  return {
    key,
    url,
    alt: str(one["alt"], 300),
    focus,
    fit: pick(one["fit"], ["cover", "contain"] as const, "cover"),
  };
}

export function cleanLink(value: unknown): SiteLink | null {
  if (!value || typeof value !== "object") return null;
  const one = value as Record<string, unknown>;
  const label = str(one["label"], 80);
  const to = cleanLinkTarget(one["to"]);
  if (!label || to.kind === "none") return null;
  return { label, to, tone: pick(one["tone"], ["primary", "secondary", "quiet"] as const, "primary") };
}

export function cleanTheme(value: unknown): SiteTheme {
  const one = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const given = (one["colors"] && typeof one["colors"] === "object"
    ? one["colors"]
    : {}) as Record<string, unknown>;
  const colors: Partial<Record<SiteColorToken, string>> = {};
  for (const token of SITE_COLOR_TOKENS) {
    const held = given[token];
    if (typeof held === "string" && /^#[0-9a-fA-F]{6}$/.test(held)) {
      colors[token] = held.toLowerCase();
    }
  }
  const buttons = (one["buttons"] && typeof one["buttons"] === "object"
    ? one["buttons"]
    : {}) as Record<string, unknown>;
  return {
    palette: pick(one["palette"], SITE_PALETTES, "stone"),
    colors,
    fonts: pick(one["fonts"], SITE_PAIRINGS, "editorial"),
    typeScale: pick(one["typeScale"], ["compact", "regular", "grand"] as const, "regular"),
    headingWeight: pick(
      one["headingWeight"], ["light", "regular", "medium", "bold"] as const, "regular",
    ),
    corners: pick(one["corners"], ["square", "soft", "round"] as const, "soft"),
    buttons: {
      shape: pick(buttons["shape"], ["square", "soft", "pill"] as const, "soft"),
      secondary: pick(buttons["secondary"], ["outline", "soft", "quiet"] as const, "outline"),
    },
    width: pick(one["width"], ["narrow", "regular", "wide"] as const, "regular"),
    rhythm: pick(one["rhythm"], ["compact", "regular", "airy"] as const, "regular"),
    cards: pick(one["cards"], ["line", "shadow", "flat"] as const, "line"),
    images: pick(one["images"], ["square", "soft", "round"] as const, "soft"),
  };
}

export function cleanHeader(value: unknown): SiteHeader {
  const one = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    style: pick(one["style"], ["logoLeft", "centred", "minimal", "stacked"] as const, "logoLeft"),
    transparent: bool(one["transparent"]),
    sticky: bool(one["sticky"], true),
    logo: cleanImage(one["logo"]),
    showName: bool(one["showName"], true),
    action: cleanLink(one["action"]),
  };
}

export function cleanFooter(value: unknown): SiteFooter {
  const one = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const links = Array.isArray(one["links"]) ? one["links"] : [];
  if (links.length > 12) bad();
  return {
    style: pick(one["style"], ["columns", "simple", "band"] as const, "columns"),
    showAddress: bool(one["showAddress"], true),
    showContact: bool(one["showContact"], true),
    showTimes: bool(one["showTimes"], true),
    showSocial: bool(one["showSocial"], true),
    blurb: cleanRich(one["blurb"]),
    links: links.map(cleanLink).filter((link): link is SiteLink => link !== null),
  };
}

const SOCIAL_HOSTS: Record<keyof SiteSocial, RegExp> = {
  facebook: /(^|\.)facebook\.com$|(^|\.)fb\.com$/,
  instagram: /(^|\.)instagram\.com$/,
  youtube: /(^|\.)youtube\.com$|(^|\.)youtu\.be$/,
  x: /(^|\.)x\.com$|(^|\.)twitter\.com$/,
  tiktok: /(^|\.)tiktok\.com$/,
  spotify: /(^|\.)spotify\.com$/,
};

export function cleanSocial(value: unknown): SiteSocial {
  const one = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const out: SiteSocial = {};
  for (const name of Object.keys(SOCIAL_HOSTS) as (keyof SiteSocial)[]) {
    const held = one[name];
    if (held === undefined || held === null || held === "") continue;
    const url = cleanSiteUrl(held);
    /* The address has to belong to the service it is filed under, so a church
       cannot be talked into putting somebody else's link behind its Instagram
       mark. */
    if (!SOCIAL_HOSTS[name].test(new URL(url).hostname.toLowerCase())) bad();
    out[name] = url;
  }
  return out;
}

export function cleanBinding(value: unknown): SiteBinding | undefined {
  if (!value || typeof value !== "object") return undefined;
  const one = value as Record<string, unknown>;
  switch (one["source"]) {
    case "serviceTimes": return { source: "serviceTimes" };
    case "funds": return { source: "funds" };
    case "events": return { source: "events", limit: num(one["limit"], 1, 24, 3) };
    case "groups": {
      const typeIds = Array.isArray(one["typeIds"])
        ? one["typeIds"].filter((id): id is string => typeof id === "string" && ID.test(id)).slice(0, 12)
        : undefined;
      const held: SiteBinding = { source: "groups", limit: num(one["limit"], 1, 24, 6) };
      return typeIds && typeIds.length ? { ...held, typeIds } : held;
    }
    case "form": {
      const formSlug = str(one["formSlug"], 64).toLowerCase();
      return SLUG.test(formSlug) ? { source: "form", formSlug } : { source: "manual" };
    }
    case "manual": return { source: "manual" };
    default: return undefined;
  }
}

export function cleanSectionStyle(value: unknown): SectionStyle | undefined {
  if (!value || typeof value !== "object") return undefined;
  const one = value as Record<string, unknown>;
  const style: SectionStyle = {
    ground: pick(
      one["ground"],
      ["page", "surface", "primary", "accent", "ink", "image"] as const,
      "page",
    ),
    pad: pick(one["pad"], ["none", "compact", "regular", "generous"] as const, "regular"),
    align: pick(one["align"], ["left", "centre"] as const, "left"),
    overlay: num(one["overlay"], 0, 90, 40),
  };
  const background = cleanImage(one["background"]);
  if (background) style.background = background;
  if (one["hideOn"] === "phone" || one["hideOn"] === "desk") style.hideOn = one["hideOn"];
  return style;
}

/* ------------------------------------------------------------- the whole --- */

export interface DocLimits {
  pages: number;
  sectionsPerPage: number;
}

export const SITE_LIMITS: DocLimits = { pages: 24, sectionsPerPage: 40 };

/**
 * Checks a whole document, kind by kind.
 *
 * `cleanContent` is passed in rather than imported, because the content rules
 * live beside the sections they belong to and importing them here would make
 * the shape depend on the catalogue. Pass `cleanSectionContent` from
 * `site-sections.ts`.
 */
export function cleanSiteDoc(
  value: unknown,
  cleanContent: (type: string, variant: string, content: unknown) => {
    type: string; variant: string; content: Record<string, unknown>;
  },
): SiteDoc {
  if (!value || typeof value !== "object") bad();
  const one = value as Record<string, unknown>;
  const pages = Array.isArray(one["pages"]) ? one["pages"] : bad();
  if (pages.length === 0 || pages.length > SITE_LIMITS.pages) bad();

  const pageIds = new Set<string>();
  const slugs = new Set<string>();
  const cleanPages: SitePage[] = pages.map((item) => {
    if (!item || typeof item !== "object") bad();
    const page = item as Record<string, unknown>;
    const id = str(page["id"], 64);
    if (!ID.test(id) || pageIds.has(id)) bad();
    pageIds.add(id);

    const slug = str(page["slug"], 64).toLowerCase();
    if (slug) {
      if (!SLUG.test(slug) || RESERVED_SLUGS.has(slug) || slugs.has(slug)) bad();
      slugs.add(slug);
    }

    const sections = Array.isArray(page["sections"]) ? page["sections"] : bad();
    if (sections.length > SITE_LIMITS.sectionsPerPage) bad();
    const sectionIds = new Set<string>();
    const cleanSections: SiteSection[] = sections.map((entry) => {
      if (!entry || typeof entry !== "object") bad();
      const section = entry as Record<string, unknown>;
      const sectionId = str(section["id"], 64);
      if (!ID.test(sectionId) || sectionIds.has(sectionId)) bad();
      sectionIds.add(sectionId);
      const settled = cleanContent(
        str(section["type"], 48),
        str(section["variant"], 48),
        section["content"],
      );
      const out: SiteSection = {
        id: sectionId,
        type: settled.type,
        variant: settled.variant,
        content: settled.content,
      };
      if (section["hidden"] === true) out.hidden = true;
      const bind = cleanBinding(section["bind"]);
      if (bind) out.bind = bind;
      const style = cleanSectionStyle(section["style"]);
      if (style) out.style = style;
      return out;
    });

    const seoGiven = (page["seo"] && typeof page["seo"] === "object"
      ? page["seo"]
      : {}) as Record<string, unknown>;
    const seo: SitePageSeo = {
      title: str(seoGiven["title"], 120) || undefined,
      description: str(seoGiven["description"], 320) || undefined,
      image: cleanImage(seoGiven["image"]),
      noIndex: seoGiven["noIndex"] === true ? true : undefined,
    };

    return {
      id,
      title: str(page["title"], 80) || "Page",
      slug,
      inNav: bool(page["inNav"], true),
      seo,
      sections: cleanSections,
    };
  });

  const homeId = str(one["homeId"], 64);
  const home = cleanPages.find((page) => page.id === homeId) ?? cleanPages[0]!;
  /* Exactly one page answers the church's own address, and it is the home one.
     Any other page carrying an empty address would be unreachable. */
  for (const page of cleanPages) {
    if (page.id !== home.id && !page.slug) bad();
  }
  home.slug = "";
  home.inNav = true;

  const seoGiven = (one["seo"] && typeof one["seo"] === "object"
    ? one["seo"]
    : {}) as Record<string, unknown>;

  return {
    v: SITE_DOC_VERSION,
    template: str(one["template"], 48) || "gathering",
    theme: cleanTheme(one["theme"]),
    header: cleanHeader(one["header"]),
    footer: cleanFooter(one["footer"]),
    social: cleanSocial(one["social"]),
    pages: cleanPages,
    homeId: home.id,
    seo: {
      description: str(seoGiven["description"], 320) || undefined,
      image: cleanImage(seoGiven["image"]),
      noIndex: seoGiven["noIndex"] === true ? true : undefined,
    },
  };
}

/** Every stored object a document points at, for the sweep after a save. */
export function mediaKeysIn(doc: SiteDoc): string[] {
  const keys = new Set<string>();
  const take = (image: SiteImage | null | undefined) => {
    if (image?.key) keys.add(image.key);
  };
  const walk = (value: unknown, depth: number): void => {
    if (depth > 8 || !value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      for (const item of value) walk(item, depth + 1);
      return;
    }
    const one = value as Record<string, unknown>;
    if (typeof one["key"] === "string" && MEDIA_KEY.test(one["key"])) {
      take(one as unknown as SiteImage);
      return;
    }
    for (const entry of Object.values(one)) walk(entry, depth + 1);
  };
  take(doc.header.logo);
  take(doc.seo.image);
  for (const page of doc.pages) {
    take(page.seo.image);
    for (const section of page.sections) {
      take(section.style?.background);
      walk(section.content, 0);
    }
  }
  return [...keys];
}

/** The page an address names, or nothing. */
export function pageFor(doc: SiteDoc, slug: string): SitePage | null {
  const wanted = slug.replace(/^\/+|\/+$/g, "").toLowerCase();
  if (!wanted) return doc.pages.find((page) => page.id === doc.homeId) ?? null;
  return doc.pages.find((page) => page.slug === wanted) ?? null;
}

/** What the navigation shows, in the order the pages are kept in. */
export function navPages(doc: SiteDoc): SitePage[] {
  return doc.pages.filter((page) => page.inNav);
}

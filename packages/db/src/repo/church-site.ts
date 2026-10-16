/**
 * HRT-377, R22.2. Reading and writing a church's website.
 *
 * The editor reads the draft, saves the draft, and publishes it. The public
 * page reads the live copy, through `owner()` because the reader has no session
 * and RLS has nobody to apply. Everything an administrator does goes through
 * the tenant-scoped connection like every other write in the product, so the
 * isolation is Postgres's rather than this file's.
 *
 * A church that built a homepage on the old editor has it brought forward the
 * first time this is read. The old table is left alone afterwards: a conversion
 * that deletes the only copy of the thing it converted is a conversion nobody
 * can check.
 */

import { and, desc, eq, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { owner } from "../client";
import {
  churchSiteRevisions, churchSites, churchWebsites, storedFiles, tenants,
  type WebsiteSection,
} from "../schema/tenancy";
import { can, type Who } from "../permissions";
import { PermissionError } from "../roles";
import { InvalidInputError } from "../errors";
import type { WriteActor } from "./members";
import { listFiles } from "./storage";
import {
  cleanSiteDoc, mediaKeysIn, pageFor, SITE_DOC_VERSION,
  type SiteDoc, type SitePage,
} from "./site-doc";
import { cleanSectionContent } from "./site-sections";

export const canManageSite = (who: Who): boolean => can(who, "website.manage");

/** Checks a document the browser sent, kind by kind. */
export const cleanDoc = (value: unknown): SiteDoc =>
  cleanSiteDoc(value, cleanSectionContent);

export interface SiteState {
  draft: SiteDoc;
  draftVersion: number;
  live: SiteDoc | null;
  publishedAt: Date | null;
  /** Whether the draft says something the live copy does not. */
  changed: boolean;
}

/* ------------------------------------------------------- the old homepage --- */

const sectionId = (() => {
  let n = 0;
  return (stem: string) => `${stem}${(n += 1)}`;
})();

/**
 * One section of the old editor, as the same thing in the new shape.
 *
 * The old row held a title, a body, one picture, one video and one link, which
 * every kind here can take, so nothing a church wrote is lost. What it gains is
 * a layout it can change and a kind that knows what it is.
 */
function carryOver(old: WebsiteSection): { type: string; variant: string; content: unknown } {
  const image = old.imageKey
    ? { key: old.imageKey, url: null, alt: old.alt, focus: { x: 0.5, y: 0.5 }, fit: "cover" }
    : old.imageUrl
      ? { key: null, url: old.imageUrl, alt: old.alt, focus: { x: 0.5, y: 0.5 }, fit: "cover" }
      : null;
  const action = old.linkLabel && old.linkUrl
    ? { label: old.linkLabel, to: { kind: "url", url: old.linkUrl }, tone: "primary" }
    : null;
  const head = { eyebrow: "", title: old.title, body: old.body ? [{ t: old.body }] : [] };

  switch (old.type) {
    case "hero":
      return { type: "hero", variant: "split", content: { ...head, image, primary: action } };
    case "story":
      return { type: "intro", variant: "lead", content: { ...head, action } };
    case "banner":
      return { type: "cta", variant: "band", content: { ...head, image, primary: action } };
    case "image":
      return { type: "gallery", variant: "strip", content: { ...head, items: image ? [image] : [] } };
    case "video":
      return {
        type: "video",
        variant: "wide",
        content: { ...head, embed: old.videoUrl ?? "", video: old.videoKey ? { key: old.videoKey, url: null, alt: old.alt } : null, action },
      };
    case "services":
      return { type: "times", variant: "cards", content: { ...head, action } };
    case "contact":
    default:
      return {
        type: "contact",
        variant: "columns",
        content: { ...head, showAddress: true, showContact: true, showSocial: true, action },
      };
  }
}

/** The old three starting designs, as the nearest of the new ones. */
const OLD_TEMPLATES: Record<string, string> = {
  gathering: "gathering",
  community: "community",
  classic: "heritage",
};

export function docFromOldWebsite(old: {
  layout: string;
  sections: WebsiteSection[];
}): SiteDoc {
  const sections = old.sections.map((one) => {
    const carried = carryOver(one);
    return {
      id: sectionId("s"),
      type: carried.type,
      variant: carried.variant,
      content: carried.content,
      ...(carried.type === "times" ? { bind: { source: "serviceTimes" } } : {}),
    };
  });
  return cleanDoc({
    v: SITE_DOC_VERSION,
    template: OLD_TEMPLATES[old.layout] ?? "gathering",
    theme: {},
    header: {},
    footer: {},
    social: {},
    homeId: "home",
    pages: [{ id: "home", title: "Home", slug: "", inNav: true, seo: {}, sections }],
    seo: {},
  });
}

/* --------------------------------------------------------------- the read --- */

/**
 * What the editor opens on.
 *
 * Null for a church that has never had a website at all, which is the signal to
 * offer the gallery of starting designs. A church whose homepage was built on
 * the old editor gets it back here, converted, and the conversion is written
 * down so it only happens once.
 */
export async function siteState(db: Tx, tenantId: string): Promise<SiteState | null> {
  const [row] = await db.select({
    draft: churchSites.draft,
    draftVersion: churchSites.draftVersion,
    live: churchSites.live,
    publishedAt: churchSites.publishedAt,
  }).from(churchSites).where(eq(churchSites.tenantId, tenantId)).limit(1);

  if (row) {
    const draft = cleanDoc(row.draft);
    const live = row.live ? cleanDoc(row.live) : null;
    return {
      draft,
      draftVersion: row.draftVersion,
      live,
      publishedAt: row.publishedAt,
      changed: !live || JSON.stringify(live) !== JSON.stringify(draft),
    };
  }

  const [old] = await db.select({
    published: churchWebsites.published,
    layout: churchWebsites.layout,
    sections: churchWebsites.sections,
  }).from(churchWebsites).where(eq(churchWebsites.tenantId, tenantId)).limit(1);
  if (!old || old.sections.length === 0) return null;

  const doc = docFromOldWebsite(old);
  const now = new Date();
  await db.insert(churchSites).values({
    tenantId,
    draft: doc,
    draftVersion: 1,
    live: old.published ? doc : null,
    publishedAt: old.published ? now : null,
    updatedAt: now,
  }).onConflictDoNothing();
  return {
    draft: doc,
    draftVersion: 1,
    live: old.published ? doc : null,
    publishedAt: old.published ? now : null,
    changed: !old.published,
  };
}

/* -------------------------------------------------------------- the writes --- */

export class SiteConflictError extends Error {
  readonly key = "website.error.conflict";
  constructor() {
    super("The website was saved somewhere else since this screen opened it.");
    this.name = "SiteConflictError";
  }
}

function assertCanWrite(actor: WriteActor): void {
  if (!canManageSite({ role: actor.role, permissions: actor.permissions })) {
    throw new PermissionError(actor.role, "manageWebsite");
  }
}

export interface SaveDraftResult {
  draftVersion: number;
  /** Stored objects the document no longer points at. */
  stale: string[];
}

/**
 * Writes the draft, if the screen was holding the current one.
 *
 * The version is checked in the same statement that writes, so two
 * administrators pressing save at the same moment cannot both win. The second
 * one is told, which is the whole of the concurrency story in this release.
 */
export async function saveSiteDraft(
  db: Tx,
  actor: WriteActor,
  input: { doc: unknown; version: number },
): Promise<SaveDraftResult> {
  assertCanWrite(actor);
  const doc = cleanDoc(input.doc);
  const next = input.version + 1;

  const written = await db.update(churchSites).set({
    draft: doc,
    draftVersion: next,
    updatedAt: new Date(),
    updatedBy: actor.userId ?? null,
  }).where(and(
    eq(churchSites.tenantId, actor.tenantId),
    eq(churchSites.draftVersion, input.version),
  )).returning({ version: churchSites.draftVersion });

  if (written.length === 0) {
    /* Either somebody else saved first, or this church has no row yet. */
    const [held] = await db.select({ version: churchSites.draftVersion })
      .from(churchSites).where(eq(churchSites.tenantId, actor.tenantId)).limit(1);
    if (held) throw new SiteConflictError();
    await db.insert(churchSites).values({
      tenantId: actor.tenantId,
      draft: doc,
      draftVersion: next,
      updatedBy: actor.userId ?? null,
    });
  }

  return { draftVersion: next, stale: await staleMedia(db, doc, null) };
}

/** Starts a website off from a template's document. */
export async function startSite(
  db: Tx,
  actor: WriteActor,
  doc: unknown,
): Promise<SaveDraftResult> {
  assertCanWrite(actor);
  const settled = cleanDoc(doc);
  await db.insert(churchSites).values({
    tenantId: actor.tenantId,
    draft: settled,
    draftVersion: 1,
    updatedBy: actor.userId ?? null,
  }).onConflictDoUpdate({
    target: churchSites.tenantId,
    set: {
      draft: settled,
      draftVersion: sql`${churchSites.draftVersion} + 1`,
      updatedAt: new Date(),
      updatedBy: actor.userId ?? null,
    },
  });
  const [held] = await db.select({ version: churchSites.draftVersion })
    .from(churchSites).where(eq(churchSites.tenantId, actor.tenantId)).limit(1);
  return { draftVersion: held?.version ?? 1, stale: [] };
}

/**
 * Puts the draft on the internet, and keeps a copy of what went out.
 *
 * A church is approved before it can publish, which is the rule the old editor
 * had and the reason is unchanged: a provisional church has no public door.
 */
export async function publishSite(
  db: Tx,
  actor: WriteActor,
  note?: string,
): Promise<{ publishedAt: Date }> {
  assertCanWrite(actor);
  const [tenant] = await db.select({ approvedAt: tenants.approvedAt })
    .from(tenants).where(eq(tenants.id, actor.tenantId)).limit(1);
  if (!tenant?.approvedAt) throw new InvalidInputError("website.error.approval");

  const [held] = await db.select({ draft: churchSites.draft })
    .from(churchSites).where(eq(churchSites.tenantId, actor.tenantId)).limit(1);
  if (!held) throw new InvalidInputError("website.error.document");
  const doc = cleanDoc(held.draft);

  const publishedAt = new Date();
  await db.update(churchSites).set({
    live: doc,
    publishedAt,
    publishedBy: actor.userId ?? null,
    updatedAt: publishedAt,
  }).where(eq(churchSites.tenantId, actor.tenantId));

  await db.insert(churchSiteRevisions).values({
    tenantId: actor.tenantId,
    doc,
    publishedAt,
    publishedBy: actor.userId ?? null,
    note: note?.trim() ? note.trim().slice(0, 200) : null,
  });

  return { publishedAt };
}

/** Takes the website off the internet, keeping the draft and the revisions. */
export async function unpublishSite(db: Tx, actor: WriteActor): Promise<void> {
  assertCanWrite(actor);
  await db.update(churchSites).set({
    live: null,
    publishedAt: null,
    updatedAt: new Date(),
    updatedBy: actor.userId ?? null,
  }).where(eq(churchSites.tenantId, actor.tenantId));
}

export interface SiteRevision {
  id: string;
  publishedAt: Date;
  note: string | null;
  pages: number;
}

export async function siteRevisions(db: Tx, limit = 20): Promise<SiteRevision[]> {
  const rows = await db.select({
    id: churchSiteRevisions.id,
    publishedAt: churchSiteRevisions.publishedAt,
    note: churchSiteRevisions.note,
    doc: churchSiteRevisions.doc,
  }).from(churchSiteRevisions)
    .orderBy(desc(churchSiteRevisions.publishedAt))
    .limit(limit);
  return rows.map((row) => ({
    id: row.id,
    publishedAt: row.publishedAt,
    note: row.note,
    pages: Array.isArray(row.doc?.pages) ? row.doc.pages.length : 0,
  }));
}

/**
 * Brings an earlier publish back, as the draft and as the live copy.
 *
 * Both, because the thing a church is recovering from is a publish. Putting it
 * in the draft alone would leave the mistake on the internet while the church
 * worked out what to press next.
 */
export async function restoreSiteRevision(
  db: Tx,
  actor: WriteActor,
  id: string,
): Promise<{ publishedAt: Date }> {
  assertCanWrite(actor);
  const [row] = await db.select({ doc: churchSiteRevisions.doc })
    .from(churchSiteRevisions).where(eq(churchSiteRevisions.id, id)).limit(1);
  if (!row) throw new InvalidInputError("website.error.document");
  const doc = cleanDoc(row.doc);
  const publishedAt = new Date();
  await db.update(churchSites).set({
    draft: doc,
    draftVersion: sql`${churchSites.draftVersion} + 1`,
    live: doc,
    publishedAt,
    publishedBy: actor.userId ?? null,
    updatedAt: publishedAt,
    updatedBy: actor.userId ?? null,
  }).where(eq(churchSites.tenantId, actor.tenantId));
  await db.insert(churchSiteRevisions).values({
    tenantId: actor.tenantId,
    doc,
    publishedAt,
    publishedBy: actor.userId ?? null,
    note: "restored",
  });
  return { publishedAt };
}

/* ---------------------------------------------------------------- media --- */

/**
 * Stored objects no copy of the website points at any more.
 *
 * A picture is swept only when neither the draft nor the live copy holds it,
 * because a church that takes a photograph off the draft and has not published
 * yet is still showing it to the congregation.
 */
async function staleMedia(
  db: Tx, draft: SiteDoc, live: SiteDoc | null,
): Promise<string[]> {
  const [row] = await db.select({ live: churchSites.live })
    .from(churchSites).limit(1);
  const other = live ?? (row?.live ? cleanDoc(row.live) : null);
  const keep = new Set([
    ...mediaKeysIn(draft),
    ...(other ? mediaKeysIn(other) : []),
  ]);
  const files = await listFiles(db, "website_media");
  return files.filter((file) => !keep.has(file.key)).map((file) => file.key);
}

export async function forgetSiteMedia(
  db: Tx, actor: WriteActor, keys: string[],
): Promise<void> {
  assertCanWrite(actor);
  if (keys.length === 0) return;
  for (const key of keys) {
    await db.delete(storedFiles).where(and(
      eq(storedFiles.purpose, "website_media"),
      eq(storedFiles.key, key),
    ));
  }
}

/* ---------------------------------------------------------- the public read --- */

const SLUG = /^[a-z0-9][a-z0-9-]{0,62}$/;

export interface PublicSite {
  slug: string;
  doc: SiteDoc;
  church: {
    name: string;
    country: string;
    timezone: string;
    brandHue: string;
    logoKey: string | null;
    email: string | null;
    phone: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    region: string | null;
    postalCode: string | null;
    /** Whether the church can take a gift, which decides if a give button shows. */
    takesGifts: boolean;
  };
}

/**
 * The published website for a church, by the address somebody opened.
 *
 * The same gate the giving page and the group finder pass: approved, not a
 * demo, and published. Nothing about anybody in the congregation is read here.
 */
export async function publicSite(slug: string): Promise<PublicSite | null> {
  if (!SLUG.test(slug)) return null;
  const rows = await owner()<{
    slug: string;
    live: SiteDoc | null;
    name: string;
    country: string;
    timezone: string;
    brandHue: string;
    logoKey: string | null;
    email: string | null;
    phone: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    region: string | null;
    postalCode: string | null;
    takesGifts: boolean;
  }[]>`
    select t.slug, w.live, t.name, t.country, t.timezone,
           t.brand_hue::text as "brandHue", t.logo_key as "logoKey",
           t.email, t.phone,
           t.address_line1 as "addressLine1", t.address_line2 as "addressLine2",
           t.city, t.region, t.postal_code as "postalCode",
           exists (
             select 1 from stripe_accounts s
              where s.tenant_id = t.id and s.charges_enabled
           ) as "takesGifts"
      from tenants t
      join church_sites w on w.tenant_id = t.id
     where t.slug = ${slug}
       and t.approved_at is not null
       and t.demo_expires_at is null
       and w.live is not null
     limit 1`;
  const row = rows[0];
  if (!row?.live) return null;
  const { slug: found, live, ...church } = row;
  return { slug: found, doc: cleanDoc(live), church };
}

/** The page an address names on a published website, or nothing. */
export function publicPage(site: PublicSite, path: string): SitePage | null {
  const page = pageFor(site.doc, path);
  return page ?? null;
}

/**
 * Whether a stored object is one the published website points at.
 *
 * The media route answers an anonymous reader, so it asks this before signing
 * anything. A key that is in the church's storage and not on its website is
 * refused, which keeps a logo nobody published out of reach of whoever guesses
 * its name.
 */
export async function siteMediaIsPublic(slug: string, key: string): Promise<boolean> {
  const site = await publicSite(slug);
  if (!site) return false;
  return mediaKeysIn(site.doc).includes(key);
}

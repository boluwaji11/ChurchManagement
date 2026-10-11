import { and, eq, inArray } from "drizzle-orm";
import type { Tx } from "../client";
import { owner } from "../client";
import {
  churchWebsites, storedFiles, tenants, type WebsiteSection,
} from "../schema/tenancy";
import { can, type Who } from "../permissions";
import { PermissionError } from "../roles";
import { InvalidInputError } from "../errors";
import type { WriteActor } from "./members";
import { holdsFile, listFiles } from "./storage";
import {
  cleanWebsiteSections, websiteVideoEmbedUrl,
} from "./website-rules";

export const WEBSITE_LAYOUTS = ["gathering", "community", "classic"] as const;
export type WebsiteLayout = (typeof WEBSITE_LAYOUTS)[number];

export interface ChurchWebsite {
  published: boolean;
  layout: WebsiteLayout;
  sections: WebsiteSection[];
}

export interface SaveChurchWebsiteInput extends Omit<ChurchWebsite, "sections"> {
  sections: unknown;
}

export interface PublicWebsite extends ChurchWebsite {
  slug: string;
  churchName: string;
  country: string;
  brandHue: string;
  email: string | null;
  phone: string | null;
  services: { name: string; dayOfWeek: number; startsAt: string }[];
}

export const canManageWebsite = (who: Who): boolean => can(who, "website.manage");

export async function websiteForEditor(db: Tx): Promise<ChurchWebsite | null> {
  const [row] = await db.select({
    published: churchWebsites.published,
    layout: churchWebsites.layout,
    sections: churchWebsites.sections,
  }).from(churchWebsites).limit(1);
  return row ? { ...row, layout: row.layout as WebsiteLayout } : null;
}

export async function saveChurchWebsite(
  db: Tx,
  actor: WriteActor,
  input: SaveChurchWebsiteInput,
): Promise<string[]> {
  if (!canManageWebsite({ role: actor.role, permissions: actor.permissions })) {
    throw new PermissionError(actor.role, "manageWebsite");
  }
  if (!WEBSITE_LAYOUTS.includes(input.layout)) {
    throw new InvalidInputError("website.error.layout");
  }
  if (input.published) {
    const [tenant] = await db.select({ approvedAt: tenants.approvedAt }).from(tenants).limit(1);
    if (!tenant?.approvedAt) throw new InvalidInputError("website.error.approval");
  }
  const sections = cleanWebsiteSections(input.sections);
  for (const section of sections) {
    for (const key of [section.imageKey, section.videoKey]) {
      if (key && !(await holdsFile(db, key, "website_media"))) {
        throw new InvalidInputError("website.error.media");
      }
    }
  }
  const values = {
    tenantId: actor.tenantId,
    published: input.published,
    layout: input.layout,
    sections,
    updatedAt: new Date(),
  };
  await db.insert(churchWebsites).values(values).onConflictDoUpdate({
    target: churchWebsites.tenantId,
    set: {
      published: values.published,
      layout: values.layout,
      sections: values.sections,
      updatedAt: values.updatedAt,
    },
  });
  const keep = new Set(sections.flatMap((section) =>
    [section.imageKey, section.videoKey].filter((key): key is string => Boolean(key)),
  ));
  const files = await listFiles(db, "website_media");
  return files.filter((file) => !keep.has(file.key)).map((file) => file.key);
}

export async function forgetWebsiteMedia(
  db: Tx,
  actor: WriteActor,
  keys: string[],
): Promise<void> {
  if (!canManageWebsite({ role: actor.role, permissions: actor.permissions })) {
    throw new PermissionError(actor.role, "manageWebsite");
  }
  if (keys.length === 0) return;
  await db.delete(storedFiles).where(and(
    eq(storedFiles.purpose, "website_media"),
    inArray(storedFiles.key, keys),
  ));
}

export async function publicWebsite(slug: string): Promise<PublicWebsite | null> {
  const rows = await owner()<Omit<PublicWebsite, "services">[]>`
    select t.slug, t.name as "churchName", t.country, t.brand_hue::text as "brandHue",
           t.email, t.phone,
           w.published, w.layout, w.sections
      from tenants t
      join church_websites w on w.tenant_id = t.id
     where t.slug = ${slug}
       and t.approved_at is not null
       and t.demo_expires_at is null
       and w.published = true
     limit 1`;
  const row = rows[0];
  if (!row) return null;
  const services = await owner()<PublicWebsite["services"]>`
    select name, day_of_week as "dayOfWeek", starts_at as "startsAt"
      from service_times
     where tenant_id = (select id from tenants where slug = ${slug} limit 1)
      order by day_of_week, starts_at, sort_order`;
  return {
    ...row,
    layout: row.layout as WebsiteLayout,
    sections: (row.sections as WebsiteSection[]).map((section) => ({
      ...section,
      videoUrl: section.videoKey ? null : section.type === "video"
        ? websiteVideoEmbedUrl(section.videoUrl)
        : null,
    })),
    services,
  };
}

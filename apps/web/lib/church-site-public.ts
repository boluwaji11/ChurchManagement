import "server-only";
import { unstable_cache as cached, revalidateTag } from "next/cache";
import {
  EMPTY_SITE_DATA, publicSite, siteData, type PublicSite, type SiteData,
} from "@connectapp/db";
import type { SiteDoc } from "@connectapp/db/rules";

/**
 * HRT-383, R22.2, R24.11. Reading a published church website, quickly.
 *
 * A church's website is the one page in this product read by people who have
 * never signed in and who are on a telephone on a slow connection, so the
 * published page is the one place where a cold read of the database on every
 * request is not good enough. Two reads are held: the document, which changes
 * only when the church publishes, and what the document asks the church for,
 * which changes when a group is published or an event passes.
 *
 * The document is held under a tag and dropped the moment the church publishes,
 * so there is no window in which somebody presses Publish and sees the old
 * page. The bound data is held for five minutes, because an event added at
 * eleven does not need to be on the website at 11:00:01 and a church website
 * being read by two hundred people should not run five queries for each of
 * them.
 */

const docTag = (slug: string) => `site:${slug}`;
const dataTag = (slug: string) => `site-data:${slug}`;

/** The published document and the church's own facts. */
export const readPublicSite = (slug: string): Promise<PublicSite | null> =>
  cached(
    async (one: string) => publicSite(one),
    ["public-site"],
    { tags: [docTag(slug)], revalidate: 3600 },
  )(slug);

/** What the document reads from the church. */
export const readSiteData = (
  slug: string,
  doc: SiteDoc,
  today: string,
): Promise<SiteData> =>
  cached(
    async (one: string, held: SiteDoc, when: string) =>
      siteData(one, held, when).catch(() => EMPTY_SITE_DATA),
    ["public-site-data"],
    { tags: [dataTag(slug)], revalidate: 300 },
  )(slug, doc, today);

/**
 * Drops both holds for one church.
 *
 * Called when the church publishes, unpublishes or restores a revision. Also
 * called when the church's own record changes, because its address and
 * telephone number are on every page of its website.
 */
export function forgetPublicSite(slug: string): void {
  revalidateTag(docTag(slug));
  revalidateTag(dataTag(slug));
}

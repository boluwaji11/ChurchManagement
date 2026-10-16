import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { churchFromHost } from "@/lib/session";
import { readPublicSite } from "@/lib/church-site-public";

/**
 * HRT-383, R17.1. What a search engine is told a church's website holds.
 *
 * On a church's own host it lists that church's published pages. On ours it
 * lists the handful of pages the product itself has. One file, because the
 * address decides whose site this is, the same way the page does.
 */

export const dynamic = "force-dynamic";

async function origin(): Promise<string> {
  const head = await headers();
  const host = head.get("x-forwarded-host") ?? head.get("host") ?? "connectapp.church";
  const scheme = head.get("x-forwarded-proto")
    ?? (host.startsWith("localhost") || host.includes("127.0.0.1") ? "http" : "https");
  return `${scheme}://${host}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await origin();
  const church = await churchFromHost();

  if (church) {
    const site = await readPublicSite(church);
    if (!site || site.doc.seo.noIndex) return [];
    return site.doc.pages
      .filter((page) => !page.seo.noIndex)
      .map((page) => ({
        url: page.id === site.doc.homeId ? `${base}/` : `${base}/${page.slug}`,
        changeFrequency: "weekly" as const,
        priority: page.id === site.doc.homeId ? 1 : 0.7,
      }));
  }

  return ["/", "/trust", "/sign-up", "/sign-in"].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: "monthly" as const,
    priority: path === "/" ? 1 : 0.5,
  }));
}

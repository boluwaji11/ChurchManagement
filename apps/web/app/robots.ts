import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { churchFromHost } from "@/lib/session";
import { readPublicSite } from "@/lib/church-site-public";

/**
 * HRT-383, R17.1, R21.4. What a crawler may read.
 *
 * Everything behind a sign-in is refused by name, on a church's host and on
 * ours. A church that has asked to be kept out of search engines is refused
 * altogether, which is the only honest reading of that switch.
 */

export const dynamic = "force-dynamic";

const PRIVATE = [
  "/api/", "/settings/", "/dashboard", "/members", "/groups/", "/services",
  "/schedule", "/messages", "/calendar", "/checkin", "/reports", "/followups",
  "/incidents", "/giving", "/forms", "/website", "/home", "/site-media/",
  "/choose-church", "/create-church", "/import", "/u/", "/demo",
];

export default async function robots(): Promise<MetadataRoute.Robots> {
  const head = await headers();
  const host = head.get("x-forwarded-host") ?? head.get("host") ?? "connectapp.church";
  const scheme = head.get("x-forwarded-proto")
    ?? (host.startsWith("localhost") || host.includes("127.0.0.1") ? "http" : "https");
  const base = `${scheme}://${host}`;
  const church = await churchFromHost();

  if (church) {
    const site = await readPublicSite(church);
    if (!site || site.doc.seo.noIndex) {
      return { rules: [{ userAgent: "*", disallow: "/" }] };
    }
  }

  return {
    rules: [{ userAgent: "*", allow: "/", disallow: PRIVATE }],
    sitemap: `${base}/sitemap.xml`,
  };
}

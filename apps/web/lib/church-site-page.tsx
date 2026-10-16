import "server-only";
import * as React from "react";
import type { Metadata } from "next";
import { pageFor, type SitePage } from "@connectapp/db/rules";
import { PublishedPage } from "@/components/church-site/page-view";
import { mediaUrl } from "@/components/church-site/kit";
import { readPublicSite, readSiteData } from "@/lib/church-site-public";
import { churchToday, siteCtxFrom } from "@/lib/church-site-view";

/**
 * HRT-381, HRT-383, R17.1, R22.2. Serving one page of a church's website.
 *
 * Two addresses reach it: the church's own host at `/`, which is its home page,
 * and the church's own host at `/<page>`, which is any other page it has
 * written. Both come through here so the metadata, the caching and the
 * rendering are decided once.
 */

export interface SiteHit {
  page: SitePage;
  body: React.ReactNode;
}

/** The page at this address on this church's website, or nothing. */
export async function churchSitePage(
  slug: string,
  path: string,
): Promise<SiteHit | null> {
  const site = await readPublicSite(slug);
  if (!site) return null;
  const page = pageFor(site.doc, path);
  if (!page) return null;
  const today = await churchToday(slug);
  const data = await readSiteData(slug, site.doc, today);
  const ctx = siteCtxFrom(site, data);
  return { page, body: <PublishedPage page={page} site={ctx} /> };
}

/**
 * R17.1. What a search engine and a shared link are told.
 *
 * The page's own words where it has them, the church's where it has not, and
 * never the product's: a church's website is the church's, so nothing on it
 * says ConnectApp except the one line in the footer.
 */
export async function churchSiteMetadata(
  slug: string,
  path: string,
): Promise<Metadata | null> {
  const site = await readPublicSite(slug);
  if (!site) return null;
  const page = pageFor(site.doc, path);
  if (!page) return null;

  const name = site.church.name;
  const title = page.seo.title ?? (page.slug ? `${page.title} - ${name}` : name);
  const description = page.seo.description ?? site.doc.seo.description;
  const picture = mediaUrl(page.seo.image ?? site.doc.seo.image ?? null);
  const noIndex = Boolean(page.seo.noIndex || site.doc.seo.noIndex);
  const where = page.slug ? `/${page.slug}` : "/";

  return {
    title,
    ...(description ? { description } : {}),
    alternates: { canonical: where },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      type: "website",
      siteName: name,
      title,
      ...(description ? { description } : {}),
      url: where,
      ...(picture ? { images: [{ url: picture }] } : {}),
    },
    twitter: {
      card: picture ? "summary_large_image" : "summary",
      title,
      ...(description ? { description } : {}),
      ...(picture ? { images: [picture] } : {}),
    },
  };
}

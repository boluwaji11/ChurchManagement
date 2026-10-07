import { cache } from "react";
import type { Metadata } from "next";
import { resolveTenantBySlug } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { requireSession } from "./session";
import { tabTitle } from "./tab-title";

/**
 * R17.1. The browser tab's name, through Next's own metadata.
 *
 * A `<title>` in the markup is right until the router replaces the head,
 * which it does on every soft navigation and every refresh, and the tab falls
 * back to the product's name. Metadata is the one thing the router keeps, so
 * the name is declared where it will not be overwritten.
 *
 * The session is read per request and cached, so asking for it here costs
 * nothing the page was not paying already.
 */
export async function tabMetadata(page: string, church?: string): Promise<Metadata> {
  const session = await requireSession(church);
  return { title: tabTitle(page, session.tenantName) };
}

/** The church behind a public address, held for the length of one request. */
const named = cache(async (slug?: string) =>
  slug ? (await resolveTenantBySlug(slug))?.name ?? null : null,
);

/**
 * R17.1. The browser tab on a page with no session.
 *
 * A giving page, a group finder, a form: whoever opens one came for the
 * church rather than for us, so the church's name is what the tab carries.
 * Where there is no church in the address, the product's own name stands in,
 * because that is whose page it is.
 */
export async function publicTab(page: string, slug?: string): Promise<Metadata> {
  return { title: tabTitle(page, (await named(slug)) ?? t("app.name")) };
}

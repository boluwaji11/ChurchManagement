import type { Metadata } from "next";
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

import { notFound } from "next/navigation";
import {
  canManageSite, getChurch, siteData, siteState, withTenant,
} from "@connectapp/db";
import { pageFor } from "@connectapp/db/rules";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { tabMetadata } from "@/lib/page-metadata";
import { PublishedPage } from "@/components/church-site/page-view";
import { churchToday, siteCtxFrom } from "@/lib/church-site-view";
import type { PublicSite } from "@connectapp/db";

/**
 * HRT-383, R22.2. The draft, seen as a visitor would see it.
 *
 * The editor's canvas carries chrome: rings, handles, labels, and placeholders
 * where a church has written nothing yet. This is the page with all of that
 * taken away, which is the only honest answer to "what will people see". It is
 * also the editor's own phone and tablet views, held in a frame at that width,
 * because a layout answers to the width of the window rather than the width of
 * a box inside it.
 *
 * Behind the same sign-in as the editor, so an unpublished website is readable
 * by the church's own staff and by nobody else.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return tabMetadata(t("website.openPreview"));
}

export default async function WebsitePreview({
  params,
}: {
  params: Promise<{ page?: string[] }>;
}) {
  const session = await requireSession();
  if (!canManageSite(session)) notFound();

  const context = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };
  const state = await withTenant(context, (tx) => siteState(tx, session.tenantId));
  if (!state) notFound();

  const { page: parts } = await params;
  const path = (parts ?? []).join("/");
  const page = pageFor(state.draft, path);
  if (!page) notFound();

  const today = await churchToday(session.tenantSlug);
  const data = await siteData(session.tenantSlug, state.draft, today);

  /*
   * The church's own facts, read through the same gate the published page uses,
   * so the preview cannot show something the live page would leave out.
   */
  const church = await withTenant(context, (tx) =>
    getChurch(tx, session.tenantId, session));

  const site: PublicSite = {
    slug: session.tenantSlug,
    doc: state.draft,
    church: {
      name: session.tenantName,
      country: session.tenantCountry,
      timezone: church?.timezone ?? "America/Chicago",
      brandHue: church?.brandHue ?? "indigo",
      logoKey: church?.logoKey ?? null,
      email: church?.email ?? null,
      phone: church?.phone ?? null,
      addressLine1: church?.addressLine1 ?? null,
      addressLine2: church?.addressLine2 ?? null,
      city: church?.city ?? null,
      region: church?.region ?? null,
      postalCode: church?.postalCode ?? null,
      takesGifts: data.takesGifts,
    },
  };

  return <PublishedPage page={page} site={siteCtxFrom(site, data)} />;
}

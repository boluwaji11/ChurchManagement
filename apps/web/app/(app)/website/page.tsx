import {
  canManageSite, getChurch, isApproved, listFiles, listForms, listGroupTypes,
  siteData, siteState, withTenant,
} from "@connectapp/db";
import { mediaKeysIn } from "@connectapp/db/rules";
import { t } from "@connectapp/i18n";
import { requireScreen } from "@/lib/shell-data";
import { Denied } from "@/components/denied";
import { tabMetadata } from "@/lib/page-metadata";
import { publicOrigin } from "@/lib/church-address";
import { churchToday, siteCtxFrom } from "@/lib/church-site-view";
import type { PublicSite } from "@connectapp/db";
import { Workspace } from "./builder/workspace";

/**
 * HRT-378, R22.2. The website builder.
 *
 * Everything the editor needs is read here, once, on the server: the draft, the
 * church's own facts, what the draft asks the church for, the photographs it has
 * uploaded, and the lists behind the pickers. The editor then works in the
 * browser without going back for anything until it saves.
 *
 * A church with no website at all gets the gallery of starting designs instead,
 * which is the same screen with nothing loaded into it.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return tabMetadata(t("website.title"));
}

export default async function WebsiteBuilderPage() {
  const session = await requireScreen();
  if (!canManageSite(session)) {
    return <Denied role={session.role} action="manageWebsite" church={session.tenantSlug} />;
  }

  const context = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };

  const [state, church, approved, files, forms, groupTypes] = await withTenant(
    context,
    async (tx) => Promise.all([
      siteState(tx, session.tenantId),
      getChurch(tx, session.tenantId, session),
      isApproved(tx, session.tenantId),
      listFiles(tx, "website_media"),
      listForms(tx),
      listGroupTypes(tx),
    ]),
  );

  const doc = state?.draft ?? null;
  const today = await churchToday(session.tenantSlug);
  const data = doc
    ? await siteData(session.tenantSlug, doc, today)
    : { services: [], events: [], groups: [], funds: [], forms: {}, takesGifts: false };

  const address = [
    church?.addressLine1, church?.addressLine2, church?.city, church?.region,
    church?.postalCode,
  ].filter(Boolean).join(", ") || null;

  const used = doc ? new Set(mediaKeysIn(doc)) : new Set<string>();

  const site: PublicSite | null = doc
    ? {
        slug: session.tenantSlug,
        doc,
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
      }
    : null;

  return (
    <Workspace
      doc={doc}
      version={state?.draftVersion ?? 0}
      publishedAt={state?.publishedAt?.toISOString() ?? null}
      changed={state?.changed ?? true}
      site={site ? siteCtxFrom(site, data, { editing: true }) : null}
      church={{
        name: session.tenantName,
        slug: session.tenantSlug,
        address,
        hasServiceTimes: data.services.length > 0,
        takesGifts: data.takesGifts,
        logoKey: church?.logoKey ?? null,
        /* A church's website answers on the church's own address and
           nowhere else, so this is empty until it has one. */
        liveUrl: (await publicOrigin(session.tenantSlug)) ?? "",
        canPublish: approved,
      }}
      forms={forms
        .filter((one) => one.status !== "draft" && !one.archivedAt)
        .map((one) => ({ slug: one.slug, name: one.name }))}
      groupTypes={groupTypes.map((one) => ({ id: one.id, name: one.name }))}
      media={files.map((one) => ({
        key: one.key,
        bytes: one.bytes,
        uploadedAt: one.createdAt instanceof Date
          ? one.createdAt.toISOString()
          : String(one.createdAt),
        inUse: used.has(one.key),
      }))}
    />
  );
}

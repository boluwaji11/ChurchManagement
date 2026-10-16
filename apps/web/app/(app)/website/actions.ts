"use server";

import { revalidatePath } from "next/cache";
import {
  canManageSite, forgetSiteMedia, publishSite, restoreSiteRevision, saveSiteDraft,
  siteRevisions, siteState, startSite, unpublishSite, withTenant,
  SiteConflictError,
} from "@connectapp/db";
import type { SiteDoc } from "@connectapp/db/rules";
import { requireSession } from "@/lib/session";
import { explain } from "@/lib/explain";
import { t } from "@connectapp/i18n";
import { supabaseServer } from "@/lib/supabase/server";
import { forgetPublicSite } from "@/lib/church-site-public";

/**
 * HRT-378, R22.2. What the editor asks the server to do.
 *
 * Four writes: start a website from a design, save the draft, publish it, and
 * go back to an earlier publish. Each one checks the permission and the tenant
 * on the server, because the browser is holding a document it was handed and
 * nothing it sends back is trusted.
 */

export interface SaveResult {
  version?: number;
  error?: string;
  /** Somebody else saved while this screen was open. */
  conflict?: boolean;
}

async function context() {
  const session = await requireSession();
  if (!canManageSite(session)) throw new Error("website.denied");
  return {
    session,
    tenant: {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      permissions: session.permissions,
    },
  };
}

/** The pictures a save left behind, swept from storage and from our records. */
async function sweep(
  tenant: Awaited<ReturnType<typeof context>>["tenant"],
  stale: string[],
): Promise<void> {
  if (stale.length === 0) return;
  const supabase = await supabaseServer();
  const removed = await supabase.storage.from("church").remove(stale);
  if (removed.error) return;
  await withTenant(tenant, (tx) => forgetSiteMedia(tx, tenant, stale));
}

export async function saveDraft(doc: SiteDoc, version: number): Promise<SaveResult> {
  try {
    const { tenant } = await context();
    const result = await withTenant(tenant, (tx) =>
      saveSiteDraft(tx, tenant, { doc, version }));
    await sweep(tenant, result.stale);
    return { version: result.draftVersion };
  } catch (error) {
    if (error instanceof SiteConflictError) {
      return { conflict: true, error: t("website.error.conflict") };
    }
    return { error: explain(error) };
  }
}

export async function startFromTemplate(doc: SiteDoc): Promise<SaveResult> {
  try {
    const { tenant } = await context();
    const result = await withTenant(tenant, (tx) => startSite(tx, tenant, doc));
    revalidatePath("/website");
    return { version: result.draftVersion };
  } catch (error) {
    return { error: explain(error) };
  }
}

export interface PublishResult {
  publishedAt?: string;
  error?: string;
}

export async function publish(note?: string): Promise<PublishResult> {
  try {
    const { session, tenant } = await context();
    const { publishedAt } = await withTenant(tenant, (tx) =>
      publishSite(tx, tenant, note));
    forgetPublicSite(session.tenantSlug);
    revalidatePath("/website");
    return { publishedAt: publishedAt.toISOString() };
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function takeDown(): Promise<PublishResult> {
  try {
    const { session, tenant } = await context();
    await withTenant(tenant, (tx) => unpublishSite(tx, tenant));
    forgetPublicSite(session.tenantSlug);
    revalidatePath("/website");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export interface RevisionRow {
  id: string;
  publishedAt: string;
  note: string | null;
  pages: number;
}

export async function listRevisions(): Promise<RevisionRow[]> {
  const { tenant } = await context();
  const rows = await withTenant(tenant, (tx) => siteRevisions(tx));
  return rows.map((row) => ({
    id: row.id,
    publishedAt: row.publishedAt.toISOString(),
    note: row.note,
    pages: row.pages,
  }));
}

export interface RestoreResult {
  error?: string;
  doc?: SiteDoc;
  version?: number;
}

export async function restoreRevision(id: string): Promise<RestoreResult> {
  try {
    const { session, tenant } = await context();
    await withTenant(tenant, (tx) => restoreSiteRevision(tx, tenant, id));
    const state = await withTenant(tenant, (tx) => siteState(tx, session.tenantId));
    forgetPublicSite(session.tenantSlug);
    revalidatePath("/website");
    return state ? { doc: state.draft, version: state.draftVersion } : {};
  } catch (error) {
    return { error: explain(error) };
  }
}

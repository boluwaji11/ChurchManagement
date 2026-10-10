"use server";

import { revalidatePath } from "next/cache";
import {
  withTenant, setCustomDomain, setSelfSignup,
  canManageChurch, readDomain, dnsResolver, type DomainFindings,
  setPortalName, portalNameFree, cleanPortalName,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { explain } from "@/lib/explain";

export interface DomainResult {
  domain?: string | null;
  error?: string;
}

/** R1.1. The church's own address, set or cleared. */
export async function saveDomain(domain: string, church?: string): Promise<DomainResult> {
  try {
    const session = await requireSession(church);
    const saved = await withTenant(
      {
        tenantId: session.tenantId,
        role: session.role,
        userId: session.userId,
        permissions: session.permissions,
      },
      (tx) =>
        setCustomDomain(
          tx,
          { tenantId: session.tenantId, role: session.role, userId: session.userId },
          { domain: domain.trim() || null },
        ),
    );
    revalidatePath("/settings/church");
    return { domain: saved };
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R1.7. Opening or shutting the church's own door to new accounts. */
export async function setSignup(open: boolean, church?: string): Promise<{ error?: string }> {
  try {
    const session = await requireSession(church);
    await setSelfSignup(session.tenantId, session.role, open);
    revalidatePath("/settings/church");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/**
 * HRT-283, R22.2. Read the church's domain and say what is published.
 *
 * Nothing is written anywhere by this. It is the lookup any mail server on the
 * internet does before it delivers to them, done where the church can read the
 * answer, so the screen that asks to touch their DNS can first show that it
 * knows what is already there.
 */
export async function checkDomain(
  domain: string,
  church?: string,
  /** Our own host, so the reading can say whether the name reaches us yet. */
  expect?: string,
): Promise<{ found?: DomainFindings; error?: string }> {
  const session = await requireSession(church);
  if (!canManageChurch(session)) {
    return { error: t("domain.error.notAllowed") };
  }

  const found = await readDomain(domain, dnsResolver(), expect);
  return found ? { found } : { error: t("domain.error.notADomain") };
}

/**
 * R1.1, R17.1. Whether this name is free, and taking it.
 *
 * Checked against every church's chosen name and every church's slug, because
 * a name that shadowed another church's own address would take that address
 * away from them.
 */
export async function claimPortalName(
  name: string,
  church?: string,
): Promise<{ name?: string | null; free?: boolean; error?: string }> {
  const session = await requireSession(church);
  if (!canManageChurch(session)) return { error: t("domain.error.notAllowed") };

  try {
    const saved = await withTenant(
      {
        tenantId: session.tenantId,
        role: session.role,
        userId: session.userId,
        permissions: session.permissions,
      },
      (tx) =>
        setPortalName(
          tx,
          { tenantId: session.tenantId, role: session.role, userId: session.userId },
          { name: name.trim() || null },
        ),
    );
    revalidatePath("/settings/website");
    return { name: saved, free: true };
  } catch (reason) {
    return { error: explain(reason) };
  }
}

/** R1.1. A look before the press, so a taken name says so as it is typed. */
export async function checkPortalName(
  name: string,
  church?: string,
): Promise<{ free: boolean; cleaned: string | null }> {
  const session = await requireSession(church);
  if (!canManageChurch(session)) return { free: false, cleaned: null };

  const cleaned = cleanPortalName(name);
  if (!cleaned) return { free: false, cleaned: null };
  return { free: await portalNameFree(cleaned, session.tenantId), cleaned };
}

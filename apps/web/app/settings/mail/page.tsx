import { redirect } from "next/navigation";
import { withTenant, getEmailProvider, canManageChurch } from "@hearth/db";
import { requireSession } from "@/lib/session";
import { MailForm } from "./mail-form";

export const dynamic = "force-dynamic";

/**
 * R16.1. The church's own mail account.
 *
 * Hearth never resells a message. A church that wants to send more than the
 * shared transactional allowance gives us credentials for an account it already
 * pays for, and we send through that.
 */
export default async function MailSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  if (!canManageChurch(session.role)) redirect(`/settings?church=${session.tenantSlug}`);

  const current = await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId },
    (tx) => getEmailProvider(tx),
  );

  return <MailForm church={session.tenantSlug} current={current} />;
}

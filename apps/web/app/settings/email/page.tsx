import { withTenant, emailProvider, sendingDomain, canManageChurch } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { Denied } from "@/components/denied";
import { SettingsHeading } from "../heading";
import { EmailSetup } from "./email-setup";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata() {
  return tabMetadata(t("settings.tab.email"));
}

/**
 * HRT-287, R16.1, R21.15. The account a church's email leaves through.
 *
 * The church owns the account and pays the bill. Two ways in, and the first of
 * them is the mail it already has: a church on Google Workspace already sends
 * from its own domain, so its SPF, its DKIM and its DMARC are right before we
 * arrive and there is nothing to add at a registrar. Resend is for the church
 * sending more in a day than its mail host allows, and that one costs it two
 * records.
 *
 * Nothing here reads a credential. The password is sealed on the way in and
 * opened by the worker that sends, and whether the records are published is
 * answered from public DNS, which is what every mail server on the internet
 * reads anyway.
 */
export default async function EmailPage() {
  const session = await requireSession();
  if (!canManageChurch(session)) {
    return <Denied role={session.role} action="editChurch" church={session.tenantSlug} />;
  }

  const read = await withTenant(
    {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      permissions: session.permissions,
    },
    async (tx) => ({
      provider: await emailProvider(tx),
      domain: await sendingDomain(tx),
    }),
  );

  return (
    <>
      <SettingsHeading title="settings.tab.email" lede="settings.lede.email" />
      <EmailSetup
        provider={read.provider}
        domain={
          read.domain
            ? {
                ...read.domain,
                checkedAt: read.domain.checkedAt?.toISOString() ?? null,
              }
            : null
        }
      />
    </>
  );
}

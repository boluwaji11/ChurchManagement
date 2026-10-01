import { withTenant, getEmailSender, canManageChurch } from "@hearth/db";
import { Banner } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { requireSession } from "@/lib/session";
import { SenderForm } from "./sender-form";

export const dynamic = "force-dynamic";

/** R16.2. Where a church puts its own email provider. */
export default async function EmailSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  if (!canManageChurch(session.role)) {
    return <Banner tone="info" title={t("email.title")}>{t("forbidden.askAdmin")}</Banner>;
  }

  const sender = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    (tx) => getEmailSender(tx, session.tenantId),
  );

  return (
    <SenderForm
      church={session.tenantSlug}
      canEdit
      values={
        sender
          ? {
              provider: sender.provider,
              fromName: sender.fromName,
              fromEmail: sender.fromEmail,
              replyTo: sender.replyTo,
              host: sender.host,
              port: sender.port,
              username: sender.username,
              hasSecret: sender.hasSecret,
              verifiedAt: sender.verifiedAt
                ? sender.verifiedAt.toLocaleString("en-US", {
                    month: "long", day: "numeric", hour: "numeric", minute: "2-digit",
                  })
                : null,
              lastError: sender.lastError,
            }
          : null
      }
    />
  );
}

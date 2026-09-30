import { Badge, Card, CardTitle, Separator } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { requireSession } from "@/lib/session";
import { SignOutButton } from "@/components/sign-out-button";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await requireSession();

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardTitle>{t("account.title")}</CardTitle>
        <Separator className="my-4" />
        <dl className="mb-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          <div className="flex flex-col">
            <dt className="text-label text-fg-muted">{t("account.name")}</dt>
            <dd className="text-[length:var(--d-text-body)] text-fg">{session.displayName}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-label text-fg-muted">{t("account.email")}</dt>
            <dd className="text-[length:var(--d-text-body)] text-fg">{session.email}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-label text-fg-muted">{t("account.church")}</dt>
            <dd className="text-[length:var(--d-text-body)] text-fg">{session.tenantName}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-label text-fg-muted">{t("account.role")}</dt>
            <dd><Badge tone="neutral">{t(`role.${session.role}`)}</Badge></dd>
          </div>
        </dl>
        <SignOutButton />
      </Card>
    </div>
  );
}

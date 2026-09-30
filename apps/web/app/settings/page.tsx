import { withTenant, getChurch, listServiceTimes, canManageChurch } from "@hearth/db";
import { t } from "@hearth/i18n";
import { PageTitle } from "@/components/section";
import { requireSession } from "@/lib/session";
import { AppHeader } from "@/components/app-header";
import { ChurchForm } from "./church-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  const { profile, services } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => ({
      profile: await getChurch(tx, session.tenantId),
      services: await listServiceTimes(tx),
    }),
  );

  return (
    <>
      <AppHeader session={session} />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <PageTitle title={t("church.title")} lede={session.tenantName} />
        {profile ? (
          <ChurchForm
            values={profile}
            services={services}
            canEdit={canManageChurch(session.role)}
          />
        ) : null}
      </main>
    </>
  );
}

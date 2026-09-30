import { withTenant, listSessions, describeDevice } from "@hearth/db";
import { Banner, Card, CardTitle, Separator } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { PageTitle } from "@/components/section";
import { requireSession, currentSessionId } from "@/lib/session";
import { AppHeader } from "@/components/app-header";
import { Sessions } from "./sessions";

export const dynamic = "force-dynamic";

const when = (date: Date) =>
  date.toLocaleString(undefined, {
    day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit",
  });

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);
  const currentId = await currentSessionId();

  const sessions = await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId },
    (tx) => listSessions(tx),
  );

  return (
    <>
      <AppHeader session={session} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <PageTitle title={t("account.title")} lede={session.email} />

        <Card>
          <CardTitle>{t("session.title")}</CardTitle>
          <Separator className="my-4" />

          {sessions === null ? (
            <Banner tone="info" title={t("session.unavailable")} />
          ) : (
            <Sessions
              church={session.tenantSlug}
              rows={sessions.map((s) => {
                const device = describeDevice(s.userAgent);
                return {
                  id: s.id,
                  browser: device.browser,
                  platform: device.platform,
                  ip: s.ip,
                  createdAt: when(s.createdAt),
                  lastSeenAt: when(s.lastSeenAt),
                  current: s.id === currentId,
                };
              })}
            />
          )}
        </Card>
      </main>
    </>
  );
}

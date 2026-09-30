import { withTenant, listSessions, describeDevice } from "@hearth/db";
import { Banner, Card, CardTitle, Separator } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { requireSession, currentSessionId } from "@/lib/session";
import { Sessions } from "../sessions";

export const dynamic = "force-dynamic";

const when = (date: Date) =>
  date.toLocaleString(undefined, {
    day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit",
  });

export default async function SecurityPage() {
  const session = await requireSession();
  const currentId = await currentSessionId();

  const sessions = await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId },
    (tx) => listSessions(tx),
  );

  return (
    <div className="flex flex-col gap-6">
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
    </div>
  );
}

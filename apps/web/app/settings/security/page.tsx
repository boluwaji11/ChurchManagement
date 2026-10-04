import { withTenant, listSessions, describeDevice } from "@hearth/db";
import { Banner } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { requireSession, currentSessionId } from "@/lib/session";
import { Sessions } from "../sessions";
import { Password } from "./password";
import { ChangeEmail } from "./email";
import { SettingsHeading } from "../heading";

export const dynamic = "force-dynamic";

const when = (date: Date) =>
  date.toLocaleString(undefined, {
    day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit",
  });

export default async function SecurityPage() {
  const session = await requireSession();
  const currentId = await currentSessionId();

  const sessions = await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions },
    (tx) => listSessions(tx),
  );

  return (
    <div className="flex flex-col gap-5">
      <SettingsHeading title="settings.tab.security" lede="settings.lede.security" />
      <ChangeEmail current={session.email} />
      <Password />

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
    </div>
  );
}

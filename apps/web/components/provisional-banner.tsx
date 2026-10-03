import { Banner } from "@hearth/ui";
import { withTenant, churchStanding, type TenantRole } from "@hearth/db";
import { t } from "@hearth/i18n";

/**
 * R1.1. Says, while a church is being checked, that it is being checked.
 *
 * It is on every page because the cap is on every page: somebody adding their
 * twenty-sixth person should already know why it stops, rather than meeting an
 * error with no context. This is the one case a sentence is earned, because the
 * sentence is what happens next.
 */
export async function ProvisionalBanner({
  tenantId,
  role,
}: {
  tenantId: string;
  role: TenantRole;
}) {
  const standing = await withTenant({ tenantId, role }, (tx) =>
    churchStanding(tx, tenantId),
  );
  if (standing.approved) return null;

  return (
    <Banner
      tone="warning"
      title={t("provisional.title")}
      className="rounded-none border-x-0 border-t-0"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span>{t("provisional.body", { limit: String(standing.limit) })}</span>
        <span className="text-caption tabular-nums">
          {t("provisional.room", {
            people: String(standing.people),
            limit: String(standing.limit),
          })}
        </span>
      </div>
    </Banner>
  );
}

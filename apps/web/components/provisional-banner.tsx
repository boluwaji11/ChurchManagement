import { Banner } from "@connectapp/ui";
import { withTenant, churchStanding, type TenantRole } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { WatchApproval } from "./watch-approval";

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
  church,
}: {
  tenantId: string;
  role: TenantRole;
  /** R1.1. The address this church reads by, for the watch below. */
  church: string;
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
      {/* Approval lands in the admin portal, not here, so the page asks. */}
      <WatchApproval church={church} />

      <div className="flex flex-wrap items-center gap-3">
        <span>{t("provisional.body", { limit: String(standing.limit) })}</span>
        <span className="text-caption tabular-nums">
          {t("provisional.room", {
            members: String(standing.members),
            limit: String(standing.limit),
          })}
        </span>
      </div>
    </Banner>
  );
}

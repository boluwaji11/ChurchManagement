import { canManageChurch, withTenant, setupProgress } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { Denied } from "@/components/denied";
import { SettingsHeading } from "../heading";
import { BringBack } from "./bring-back";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata() {
  return tabMetadata(t("settings.tab.guide"));
}

/**
 * R22.1. Where the setup guide comes back from.
 *
 * Putting it away is church-wide and final from the rail's side, and the card
 * that offers it says a church can come back to anything it skipped. This is
 * where coming back happens, so that sentence is true.
 */
export default async function GuidePage() {
  const session = await requireSession();
  if (!canManageChurch(session)) {
    return <Denied role={session.role} action="editChurch" church={session.tenantSlug} />;
  }

  const setup = await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId },
    (tx) => setupProgress(tx, session),
  );

  return (
    <>
      <SettingsHeading title="settings.tab.guide" lede="setup.bringBack.lede" />
      <BringBack away={setup.dismissed} />
    </>
  );
}

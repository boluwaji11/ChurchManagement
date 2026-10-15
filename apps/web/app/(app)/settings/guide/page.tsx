import { withTenant, setupProgress, canManageChurch } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { tabMetadata } from "@/lib/page-metadata";
import { Denied } from "@/components/denied";
import { SettingsHeading } from "../heading";
import { GuideSettings } from "./guide-settings";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata() {
  return tabMetadata(t("settings.tab.setup"));
}

/**
 * R22.1. Every step of setting up, and the switch that brings the guide back.
 *
 * The guide itself is beside the screen and shows one phase at a time, which is
 * what keeps twelve steps from reading as homework. This is the other view of
 * the same list: all of it at once, for somebody who wants to see what is left
 * rather than what is next, and the only place a guide that has been put away
 * can be asked for again.
 */
export default async function GuidePage() {
  const session = await requireSession();
  if (!canManageChurch(session)) return <Denied action="editChurch" />;

  const progress = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    (tx) => setupProgress(tx, session),
  );

  return (
    <>
      <SettingsHeading title="settings.tab.setup" lede="settings.lede.setup" />
      <GuideSettings progress={progress} />
    </>
  );
}

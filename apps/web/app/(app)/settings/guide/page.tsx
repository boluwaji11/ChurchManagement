import { canManageChurch } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { Denied } from "@/components/denied";
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
 * Nothing to read: a church pressing Setup guide wants the guide, so this
 * turns it back on and goes to the first settings screen, with the rail
 * beside it. A screen saying "the guide is beside every screen" over a screen
 * that has it beside it is a screen saying what the reader can see.
 */
export default async function GuidePage() {
  const session = await requireSession();
  if (!canManageChurch(session)) {
    return <Denied role={session.role} action="editChurch" church={session.tenantSlug} />;
  }

  return <BringBack />;
}

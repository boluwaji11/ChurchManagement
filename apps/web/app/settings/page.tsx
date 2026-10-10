import { redirect } from "next/navigation";
import { canManageChurch } from "@connectapp/db";
import { requireSession } from "@/lib/session";
import { t } from "@connectapp/i18n";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ }>;
}) {
  const {} = await searchParams;
  return tabMetadata(t("nav.settings"));
}

/**
 * Settings opens on the first section the person can actually change.
 *
 * There is no landing page here in the design, and a page whose only content is
 * a menu that is already on screen is a page nobody wanted.
 */
export default async function SettingsPage() {
  const session = await requireSession();
  redirect(
    canManageChurch(session)
      ? "/settings/church"
      : "/settings/profile",
  );
}

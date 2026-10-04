import { redirect } from "next/navigation";
import { canManageChurch } from "@hearth/db";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

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
      ? `/settings/church?church=${session.tenantSlug}`
      : `/settings/profile?church=${session.tenantSlug}`,
  );
}

import {
  canManageChurch, canManageCustomFields, canEditPeople, canManageRooms,
  withTenant, setupProgress,
} from "@hearth/db";
import { t } from "@hearth/i18n";
import { Avatar } from "@hearth/ui";
import { requireSession } from "@/lib/session";
import { AppHeader } from "@/components/app-header";
import { SettingsTabs, type SettingsTab } from "./tabs";

export const dynamic = "force-dynamic";

/**
 * Everything a person administers, behind their own name.
 *
 * Tags and custom fields used to sit in the main navigation beside the
 * directory, which put the two things a volunteer touches every day next to two
 * they touch twice a year. The directory is the product. This is the drawer.
 */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  /*
   * R22.1. The wizard is a thing a church does once. It is here while there is
   * something left to do and gone afterwards, rather than sitting in the
   * settings of a church that finished in March.
   */
  const setup = canManageChurch(session.role)
    ? await withTenant({ tenantId: session.tenantId, role: session.role }, (tx) =>
        setupProgress(tx, session.tenantId),
      )
    : null;

  const tabs: SettingsTab[] = [
    { href: "/settings", label: t("settings.tab.account") },
    { href: "/settings/security", label: t("settings.tab.security") },
    // R3.2. What this person lets the church publish about them.
    { href: "/settings/privacy", label: t("settings.tab.privacy") },
    ...(canManageChurch(session.role)
      ? [
          ...(setup && !setup.complete
            ? [{ href: "/setup", label: t("settings.tab.setup") }]
            : []),
          { href: "/settings/church", label: t("settings.tab.church") },
          { href: "/settings/team", label: t("settings.tab.team") },
          { href: "/settings/followups", label: t("settings.tab.followups") },
          // R2.9. Skills, interests and spiritual gifts.
          { href: "/settings/abilities", label: t("settings.tab.abilities") },
        ]
      : []),
    ...(canManageRooms(session.role)
      ? [
          { href: "/settings/rooms", label: t("settings.tab.rooms") },
          { href: "/settings/stations", label: t("settings.tab.stations") },
        ]
      : []),
    ...(canEditPeople(session.role)
      ? [{ href: "/settings/tags", label: t("settings.tab.tags") }]
      : []),
    ...(canManageCustomFields(session.role)
      ? [{ href: "/settings/fields", label: t("settings.tab.fields") }]
      : []),
  ];

  return (
    <>
      <AppHeader session={session} />
      <main id="main" className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center gap-4">
          <Avatar name={session.displayName} id={session.userId} size="xl" />
          <h1 className="font-display text-display text-fg">{session.displayName}</h1>
        </div>

        <SettingsTabs tabs={tabs} church={session.tenantSlug} />

        {children}
      </main>
    </>
  );
}

import {
  canManageChurch, canManageCustomFields, canEditPeople, canManageRooms,
  canArchivePeople, withTenant, setupProgress,
} from "@hearth/db";
import { t } from "@hearth/i18n";
import { requireSession } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { SettingsNav, type SettingsGroup } from "./nav";

export const dynamic = "force-dynamic";

/**
 * R24.6. Everything a church administers, behind one menu.
 *
 * Built to docs/redesign/design: the sections grouped down the left, the one
 * being read beside them. Tags and custom fields used to sit in the main
 * navigation beside the directory, which put the two things a volunteer touches
 * every day next to two they touch twice a year. The directory is the product.
 * This is the drawer.
 */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  /*
   * R22.1. The wizard is a thing a church does once. It is here while there is
   * something left to do and gone afterwards, rather than sitting in the
   * settings of a church that finished in March.
   */
  const setup = canManageChurch(session)
    ? await withTenant({ tenantId: session.tenantId, role: session.role }, (tx) =>
        setupProgress(tx, session.tenantId),
      )
    : null;

  const groups: SettingsGroup[] = [
    {
      title: t("settings.group.church"),
      items: [
        ...(setup && !setup.complete
          ? [{ href: "/setup", label: t("settings.tab.setup") }]
          : []),
        ...(canManageChurch(session)
          ? [
              { href: "/settings/church", label: t("settings.tab.church") },
              { href: "/settings/roles", label: t("settings.tab.roles") },
              { href: "/settings/team", label: t("settings.tab.team") },
            ]
          : []),
      ],
    },
    {
      title: t("settings.group.checkin"),
      items: canManageRooms(session)
        ? [
            { href: "/settings/rooms", label: t("settings.tab.rooms") },
            { href: "/settings/stations", label: t("settings.tab.stations") },
          ]
        : [],
    },
    {
      title: t("settings.group.people"),
      items: [
        ...(canEditPeople(session)
          ? [{ href: "/settings/tags", label: t("settings.tab.tags") }]
          : []),
        ...(canManageCustomFields(session)
          ? [{ href: "/settings/fields", label: t("settings.tab.fields") }]
          : []),
        ...(canManageChurch(session)
          ? [{ href: "/settings/followups", label: t("settings.tab.followups") }]
          : []),
      ],
    },
    {
      title: t("settings.group.you"),
      items: [
        // R3.2. What this person lets the church publish about them.
        { href: "/settings/privacy", label: t("settings.tab.privacy") },
        { href: "/settings/security", label: t("settings.tab.security") },
        { href: "/settings/appearance", label: t("settings.tab.appearance") },
      ],
    },
    {
      title: t("settings.group.data"),
      items: canArchivePeople(session)
        ? [{ href: "/settings/export", label: t("settings.tab.export") }]
        : [],
    },
  ].filter((group) => group.items.length > 0);

  return (
    <AppShell session={session} title={t("nav.settings")}>
      <div className="flex flex-wrap items-stretch gap-7">
        <SettingsNav groups={groups} church={session.tenantSlug} />

        {/* A hairline between the menu and what it opened, so the two read as
            two columns rather than one wide one. */}
        <div className="flex min-w-0 flex-[999_1_400px] flex-col gap-5 md:border-l md:border-line md:pl-7">
          {children}
        </div>
      </div>
    </AppShell>
  );
}

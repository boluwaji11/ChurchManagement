import {
  canManageChurch, canManageCustomFields, canEditPeople, canManageRooms,
  canArchivePeople, canManageHouseholds, canManageGroups, canManageTeams,
  canManageServices, canManageGiving,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { PortalShell, PortalTitle } from "@/components/portal-shell";
import { readsAsMember } from "@/lib/reads-as-member";
import { SettingsNav, type SettingsGroup } from "./nav";

export const dynamic = "force-dynamic";

/**
 * R24.6. Everything a church administers, behind one menu.
 *
 * Built to docs/redesign/design: the sections across the top, each carrying its
 * own list. Tags and custom fields used to sit in the main
 * navigation beside the directory, which put the two things a volunteer touches
 * every day next to two they touch twice a year. The directory is the product.
 * This is the drawer.
 */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  const groups: SettingsGroup[] = [
    {
      title: t("settings.group.church"),
      items: [
        ...(canManageChurch(session)
          ? [
              { href: "/settings/church", label: t("settings.tab.church") },
              { href: "/settings/website", label: t("settings.tab.website") },
              { href: "/settings/roles", label: t("settings.tab.roles") },
              { href: "/settings/manage-accesses", label: t("settings.tab.access") },
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
      title: t("settings.group.services"),
      items: canManageServices(session)
        ? [
            { href: "/settings/service-template", label: t("settings.tab.plans") },
            { href: "/settings/service-type", label: t("settings.tab.kinds") },
          ]
        : [],
    },
    {
      title: t("settings.group.serving"),
      items: canManageTeams(session)
        ? [{ href: "/settings/teams", label: t("settings.tab.teams") }]
        : [],
    },
    {
      title: t("settings.group.members"),
      items: [
        ...(canManageHouseholds(session)
          ? [{ href: "/settings/households", label: t("settings.tab.households") }]
          : []),
        ...(canEditPeople(session)
          ? [{ href: "/settings/tags", label: t("settings.tab.tags") }]
          : []),
        ...(canManageCustomFields(session)
          ? [{ href: "/settings/fields", label: t("settings.tab.fields") }]
          : []),
        ...(canManageGroups(session)
          ? [{ href: "/settings/group-types", label: t("settings.tab.grouptypes") }]
          : []),
        ...(canManageChurch(session)
          ? [{ href: "/settings/followups", label: t("settings.tab.followups") }]
          : []),
      ],
    },
    {
      title: t("settings.group.money"),
      items: canManageGiving(session)
        ? [
            { href: "/settings/funds", label: t("settings.tab.funds") },
            { href: "/settings/online", label: t("settings.tab.online") },
          ]
        : [],
    },
    {
      title: t("settings.group.you"),
      items: [
        { href: "/settings/profile", label: t("settings.tab.profile") },
        // R17.2. A member's own household reads here rather than from a tab of
        // its own: it is something they look at, not somewhere they work.
        ...(readsAsMember(session)
          ? [{ href: "/settings/household", label: t("settings.tab.household") }]
          : []),
        { href: "/settings/security", label: t("settings.tab.security") },
      ],
    },
    {
      title: t("settings.group.data"),
      items: canArchivePeople(session)
        ? [{ href: "/settings/export", label: t("settings.tab.export") }]
        : [],
    },
  ].filter((group) => group.items.length > 0);

  /*
   * R17.1. A member's settings are the two screens about themselves, so they
   * read them in the portal's frame rather than being dropped into the app's
   * sidebar to find a menu with one group in it.
   */
  if (readsAsMember(session)) {
    return (
      <PortalShell session={session} tab={t("nav.settings")}>
        <PortalTitle title={t("nav.settings")} />
        <div className="flex flex-col gap-6 -mt-4">
          <SettingsNav groups={groups} church={session.tenantSlug} />
          <div className="flex min-w-0 flex-col gap-5">{children}</div>
        </div>
      </PortalShell>
    );
  }

  return (
    <AppShell session={session} title={t("nav.settings")}>
      <div className="flex flex-col gap-6 -mt-4">
        <SettingsNav groups={groups} church={session.tenantSlug} />

        <div className="flex min-w-0 flex-col gap-5">{children}</div>
      </div>
    </AppShell>
  );
}

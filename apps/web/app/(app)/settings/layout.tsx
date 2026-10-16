import {
  canManageChurch, canManageCustomFields, canEditPeople, canManageRooms,
  canArchivePeople, canManageHouseholds, canManageGroups, canManageTeams,
  canManageServices, canManageGiving,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { readsAsMember } from "@/lib/reads-as-member";
import { requireScreen } from "@/lib/shell-data";
import { Screen } from "@/components/screen";
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
  const session = await requireScreen();

  /*
   * R24.6. Six headings, in the order a church reads them: what this church
   * is, the people, what it puts on, the money, you, and getting it all back
   * out. Check-in and Schedule were headings of their own holding two names
   * and one, which is a door in front of a door.
   */
  const groups: SettingsGroup[] = [
    {
      title: t("settings.group.church"),
      items: canManageChurch(session)
        ? [
            { href: "/settings/church", label: t("settings.tab.church") },
            { href: "/settings/website", label: t("settings.tab.website") },
            /* HRT-288, R16.1, R22.2. The account its email leaves through,
               and the reading of the domain it leaves from. One name, because
               a church looking at one is looking at the other. */
            { href: "/settings/email", label: t("settings.tab.email") },
            /* HRT-291, R16.4. The messages a church writes once, beside the
               account they leave through. */
            { href: "/settings/email-templates", label: t("mailTemplate.title") },
            /* R16.11. What the church tells everybody, which sits with the
               rest of how the church speaks for itself. */
            { href: "/settings/announcements", label: t("announce.title") },
            { href: "/settings/roles", label: t("settings.tab.roles") },
            { href: "/settings/manage-accesses", label: t("settings.tab.access") },
            /* R22.1. Where a church that put the setup guide away gets it
               back, which is what the card offering to put it away says. */
            { href: "/settings/guide", label: t("settings.tab.guide") },
          ]
        : [],
    },
    {
      title: t("settings.group.members"),
      items: [
        ...(canManageTeams(session)
          ? [{ href: "/settings/teams", label: t("settings.tab.teams") }]
          : []),
        ...(canManageHouseholds(session)
          ? [{ href: "/settings/households", label: t("settings.tab.households") }]
          : []),
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
      title: t("settings.group.services"),
      items: [
        ...(canManageRooms(session)
          ? [
              { href: "/settings/rooms", label: t("settings.tab.rooms") },
              { href: "/settings/stations", label: t("settings.tab.stations") },
            ]
          : []),
        ...(canManageServices(session)
          ? [
              { href: "/settings/service-template", label: t("settings.tab.plans") },
              { href: "/settings/service-type", label: t("settings.tab.kinds") },
            ]
          : []),
        ...(canManageGroups(session)
          ? [{ href: "/settings/group-types", label: t("settings.tab.grouptypes") }]
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

  return (
    <Screen >
      <div className="flex flex-col gap-6 -mt-4">
        <SettingsNav groups={groups} />

        <div className="flex min-w-0 flex-col gap-5">{children}</div>
      </div>
    </Screen>
  );
}

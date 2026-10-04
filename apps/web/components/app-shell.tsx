import * as React from "react";
import { cookies } from "next/headers";
import {
  withTenant, countPeople, countOpenFollowUps, countGroups,
  countUnread, listNotifications, NOTIFICATION_LOOK,
  canEditPeople, canFollowUp, canReadIncidents,
} from "@hearth/db";
import { t } from "@hearth/i18n";
import { DemoBanner } from "./demo-banner";
import { ProvisionalBanner } from "./provisional-banner";
import { Sidebar, MobileTabs, type ShellEntry } from "./shell/sidebar";
import { TopBar } from "./shell/top-bar";
import { NotificationBell } from "./shell/bell";
import { when } from "@/lib/when";
import { navFor } from "./shell/nav";
import { SIDEBAR_COOKIE } from "./shell/sidebar-cookie";
import type { Session } from "@/lib/session";

/**
 * R24.6. The frame every staff screen sits in.
 *
 * Navigation down the left, the page's title and its one action across the top,
 * the page itself underneath. On a phone the sidebar is replaced by a tab bar
 * along the bottom, which is a CSS decision rather than a measured one, so the
 * server renders one tree and no screen flickers between two layouts.
 *
 * The role shown here comes from tenant_members, not from anything the browser
 * sent. It is the same value the data layer used to answer the request.
 */
export async function AppShell({
  session,
  title,
  action,
  wide,
  density,
  max,
  children,
}: {
  session: Session;
  title: string;
  /** The one filled button for this page. Some pages have none. */
  action?: React.ReactNode;
  /** A table-shaped screen that wants the room. */
  wide?: boolean;
  /**
   * The density this screen's body runs at. `office` is the default; the member
   * screens are `portal`, and a check-in station sets `station` on itself.
   */
  density?: "office" | "portal";
  /** How wide the body gets before it stops growing. */
  max?: string;
  children: React.ReactNode;
}) {
  const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "1";

  /*
   * R24.6. The numbers the design puts beside People, Follow-ups and Groups.
   * Three counts on one connection, read with the same role the page was
   * answered with, so a group leader's Groups count is their groups.
   */
  const counts = await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId },
    async (tx) => ({
      people: canEditPeople(session.role) || canReadIncidents(session.role)
        ? await countPeople(tx)
        : null,
      followups: canFollowUp(session.role) ? await countOpenFollowUps(tx) : null,
      groups: await countGroups(tx),
      // R24.6. The bell: its number, and the twenty lines behind it.
      unread: await countUnread(tx, session.userId),
      notifications: await listNotifications(tx, session.userId),
    }),
  );

  const countFor: Record<string, number | null> = {
    "/people": counts.people,
    "/followups": counts.followups,
    "/groups": counts.groups,
  };

  const entries: ShellEntry[] = navFor(session.role).map(({ icon: Icon, ...rest }) => ({
    ...rest,
    icon: <Icon aria-hidden />,
    count: countFor[rest.href] ? String(countFor[rest.href]) : undefined,
  }));

  return (
    <div className="flex min-h-dvh">
      <Sidebar
        entries={entries}
        churchName={session.tenantName}
        personName={session.displayName}
        roleName={t(`role.${session.role}` as never)}
        userId={session.userId}
        church={session.tenantSlug}
        collapsed={collapsed}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <DemoBanner tenantId={session.tenantId} />
        <ProvisionalBanner tenantId={session.tenantId} role={session.role} />

        <TopBar
          title={title}
          action={action}
          bell={
            <NotificationBell
              church={session.tenantSlug}
              unread={counts.unread}
              items={counts.notifications.map((one) => ({
                id: one.id,
                kind: NOTIFICATION_LOOK[one.kind].icon,
                hue: NOTIFICATION_LOOK[one.kind].hue,
                messageKey: one.messageKey,
                params: one.params,
                href: one.href,
                unread: one.unread,
                when: when(one.createdAt),
              }))}
            />
          }
        />

        {/* 28px above, 24px at the sides, 96px below, and it stops growing at
            1280px. Left-aligned rather than centred, which is what the design
            does and what keeps the navigation and the content in one column of
            reading. The 96px is also what keeps a phone's last control clear of
            the tab bar. */}
        <main
          id="main"
          {...(density ? { "data-density": density } : {})}
          className={`w-full flex-1 px-6 pt-7 pb-24 ${wide ? "" : max ?? "max-w-[1280px]"}`}
        >
          {/* Every screen in the design is a column with 28px between its
              blocks. */}
          <div className="flex flex-col gap-7">{children}</div>
        </main>
      </div>

      <MobileTabs entries={entries} church={session.tenantSlug} />
    </div>
  );
}

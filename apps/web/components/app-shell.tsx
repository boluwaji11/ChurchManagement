import * as React from "react";
import { cookies } from "next/headers";
import { t } from "@hearth/i18n";
import { DemoBanner } from "./demo-banner";
import { ProvisionalBanner } from "./provisional-banner";
import { Sidebar, MobileTabs, type ShellEntry } from "./shell/sidebar";
import { TopBar } from "./shell/top-bar";
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

  const entries: ShellEntry[] = navFor(session.role).map(({ icon: Icon, ...rest }) => ({
    ...rest,
    icon: <Icon aria-hidden />,
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

        <TopBar title={title} action={action} />

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

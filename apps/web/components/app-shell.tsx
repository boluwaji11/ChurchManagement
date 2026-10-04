import * as React from "react";
import { cookies } from "next/headers";
import { t } from "@hearth/i18n";
import { DemoBanner } from "./demo-banner";
import { ProvisionalBanner } from "./provisional-banner";
import { SignOutButton } from "./sign-out-button";
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
        signOut={<SignOutButton compact />}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <DemoBanner tenantId={session.tenantId} />
        <ProvisionalBanner tenantId={session.tenantId} role={session.role} />

        <TopBar title={title} action={action} />

        {/* The tab bar sits over the bottom of the page on a phone, so the
            body keeps enough room underneath to reach its last control. */}
        <main
          id="main"
          {...(density ? { "data-density": density } : {})}
          className={`flex-1 px-4 pt-6 pb-24 sm:px-6 md:pb-10 ${
            wide ? "" : `mx-auto w-full ${max ?? "max-w-7xl"}`
          }`}
        >
          {children}
        </main>
      </div>

      <MobileTabs entries={entries} church={session.tenantSlug} />
    </div>
  );
}

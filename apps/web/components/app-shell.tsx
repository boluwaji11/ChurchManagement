import * as React from "react";
import { cookies } from "next/headers";
import { NOTIFICATION_LOOK } from "@connectapp/db";
import { t, spellingFor, localeFor } from "@connectapp/i18n";
import { DemoBanner } from "./demo-banner";
import { ProvisionalBanner } from "./provisional-banner";
import { WatchAccess } from "./watch-access";
import { Sidebar, MobileTabs, type ShellEntry } from "./shell/sidebar";
import { TopBar } from "./shell/top-bar";
import { NotificationBell } from "./shell/bell";
import { when } from "@/lib/when";
import { navFor } from "./shell/nav";
import { SIDEBAR_COOKIE } from "./shell/sidebar-cookie";
import { SetupDock } from "./setup-dock";
import { SETUP_LINKS } from "@/lib/setup-links";
import { ChurchMarkProvider } from "./church-mark";
import { readsAs } from "@/lib/spelling";
import { SpellingProvider } from "./spelling-provider";
import type { Session } from "@/lib/session";
import { shellData } from "@/lib/shell-data";
import { photoUrls } from "@/lib/photos";
import { TabTitle } from "./tab-title";

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
  tab,
  action,
  wide,
  density,
  max,
  children,
}: {
  session: Session;
  /** The page's name, where the page does not already carry one. */
  title?: string;
  /**
   * R17.1. What the browser tab says, where the screen draws its own heading.
   * The title above is used when this is left out.
   */
  tab?: string;
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

  // R24.6. The bell, the church's mark, the setup path and the reader's face.
  const counts = await shellData(session);

  /*
   * R22.8. Which spelling this church reads, set before anything on the page
   * reads a string and handed to the browser so both sides say the same words.
   */
  const spelling = spellingFor(counts.church?.country);
  const locale = localeFor(counts.church?.country);
  readsAs(counts.church?.country);

  /*
   * The bucket is private, so the mark and the face are served through signed
   * URLs with an hour on them. Every staff screen is force-dynamic, so a reader
   * who leaves a tab open overnight gets fresh ones on their next navigation.
   * Both keys go up in one call: signing them one at a time was two round trips
   * to storage in the middle of the render.
   */
  const logoKey = counts.church?.logoKey ?? null;
  const signed = await photoUrls([logoKey, counts.photoKey]);
  const logoUrl = logoKey ? (signed[logoKey] ?? null) : null;
  const photoUrl = counts.photoKey ? (signed[counts.photoKey] ?? null) : null;

  const entries: ShellEntry[] = navFor(session).map(({ icon: Icon, ...rest }) => ({
    ...rest,
    icon: <Icon aria-hidden />,
  }));

  return (
    <div className="site-wash flex min-h-dvh">
      {/* R17.1. The screen and the church it belongs to, in the browser tab.
          React hoists it into the head. */}
      <TabTitle page={tab ?? title} church={session.tenantName} />

      <Sidebar
        entries={entries}
        churchName={session.tenantName}
        personName={session.displayName}
        photoUrl={photoUrl}
        roleName={t(`role.${session.role}` as never)}
        userId={session.userId}
        church={session.tenantSlug}
        logoUrl={logoUrl}
        collapsed={collapsed}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* R1.4. A role changed elsewhere reaches this screen on its own. */}
        <WatchAccess
          church={session.tenantSlug}
          access={[session.role, ...[...(session.permissions ?? [])].sort()].join("|")}
        />

        <DemoBanner info={counts.demo} />
        <ProvisionalBanner standing={counts.standing} church={session.tenantSlug} />

        <TopBar
          title={title}
          logoUrl={logoUrl}
          churchName={session.tenantName}
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
                at: one.createdAt,
                more: one.more ?? false,
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
          <ChurchMarkProvider logoUrl={logoUrl}>
            <SpellingProvider spelling={spelling} locale={locale}>
            <div className="flex flex-col gap-7">
              {/* R24.6. The screen's one action sits with the screen rather
                  than in the bar, which belongs to the product. Beside the
                  notification bell it read as another piece of chrome, and the
                  thing this page is for should not. */}
              {action ? <div className="flex justify-end">{action}</div> : null}
              {children}
            </div>
            </SpellingProvider>
          </ChurchMarkProvider>
        </main>
      </div>

      <MobileTabs entries={entries} church={session.tenantSlug} />

      {/* R22.1. The setup path, following whoever is walking it. */}
      {counts.setup && !counts.setup.complete && !counts.setup.dismissed ? (
        <SetupDock
          church={session.tenantSlug}
          done={counts.setup.settled}
          steps={counts.setup.steps.map((step) => ({
            step: step.step,
            done: step.done,
            skipped: step.skipped,
            href: SETUP_LINKS[step.step],
          }))}
        />
      ) : null}
    </div>
  );
}

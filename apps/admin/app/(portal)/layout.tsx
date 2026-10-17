import { cookies } from "next/headers";
import { whereWeAre } from "@connectapp/env";
import { requireTeamMember } from "@/lib/admin";
import { Rail } from "@/components/shell/rail";
import { TopBar } from "@/components/shell/top-bar";
import { RAIL_COOKIE } from "@/components/shell/rail-cookie";
import { EnvironmentBar } from "@/components/environment-bar";

export const dynamic = "force-dynamic";

/**
 * HRT-396, R21.x. One gate, in front of every screen in the portal.
 *
 * Every page used to call `requireTeamMember()` itself, which works until
 * somebody adds a page and forgets. Authorization that depends on remembering
 * is not authorization. Every portal screen now lives under this layout and
 * the check runs once, here, before any of them renders.
 *
 * The sign-in screen is deliberately outside it, which is the only reason
 * there is a group at all.
 */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const who = await requireTeamMember();
  const jar = await cookies();
  const collapsed = jar.get(RAIL_COOKIE)?.value === "1";
  const here = whereWeAre();

  return (
    /* The window holds the frame and the content column scrolls inside it.
       The rail used to scroll away with the page, and `sticky top-0` could not
       fix it on its own: the environment bar occupies the first 36px, so a
       rail pinned to the viewport top sits under the bar and its last entry
       falls off the bottom. Giving the row the remaining height instead means
       the rail is exactly as tall as the space it has. */
    <div className="site-wash flex h-dvh flex-col overflow-hidden">
      <EnvironmentBar environment={here.environment} productionData={here.productionData} />

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="hidden md:flex">
          <Rail who={who} collapsed={collapsed} />
        </div>

        <TopBar who={who} />

        <main className="min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}

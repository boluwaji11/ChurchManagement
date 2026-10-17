import { cookies } from "next/headers";
import { whereWeAre } from "@connectapp/env";
import { requireOperator } from "@/lib/admin";
import { Rail } from "@/components/shell/rail";
import { TopBar } from "@/components/shell/top-bar";
import { RAIL_COOKIE } from "@/components/shell/rail-cookie";

export const dynamic = "force-dynamic";

/**
 * HRT-396, R21.x. One gate, in front of every screen in the portal.
 *
 * Every page used to call `requireOperator()` itself, which works until
 * somebody adds a page and forgets. Authorization that depends on remembering
 * is not authorization. Every operator screen now lives under this layout and
 * the check runs once, here, before any of them renders.
 *
 * The sign-in screen is deliberately outside it, which is the only reason
 * there is a group at all.
 */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const who = await requireOperator();
  const jar = await cookies();
  const collapsed = jar.get(RAIL_COOKIE)?.value === "1";
  const here = whereWeAre();

  return (
    <div className="site-wash flex min-h-dvh flex-col md:flex-row">
      <div className="hidden md:flex">
        <Rail
          who={who}
          collapsed={collapsed}
          environment={here.environment}
          productionData={here.productionData}
        />
      </div>

      <TopBar who={who} environment={here.environment} productionData={here.productionData} />

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
    </div>
  );
}

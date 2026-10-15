import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { PortalShell } from "@/components/portal-shell";
import { requireScreen } from "@/lib/shell-data";
import { readsAsMember } from "@/lib/reads-as-member";
import { watchTheDatabase, noteThePage } from "@/lib/observe";

export const dynamic = "force-dynamic";

/**
 * R24.6, R24.11, R24.12. The frame every signed-in screen sits in, drawn once.
 *
 * Next keeps a shared layout across a navigation and fetches only the segment
 * that changed, so the sidebar, the top bar, the bell, the church's mark and
 * the reader's face are built on the first screen and then held. Returning the
 * frame from each page instead cost about 690ms a press, against 65ms for a
 * navigation that stays inside a layout: eleven times, for markup that is the
 * same on both screens.
 *
 * Which frame depends on the reader rather than on the address. Staff work in
 * the sidebar all week; somebody with no job in the product reads the same
 * addresses in the portal, a row of tabs over one centred column.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  /* R24.11, N3. One place turns the watching on, and tells it which screen
     this is, because every screen in the product is drawn inside this. */
  watchTheDatabase();
  await noteThePage();

  const session = await requireScreen();

  if (readsAsMember(session)) {
    return <PortalShell session={session}>{children}</PortalShell>;
  }

  return <AppShell session={session}>{children}</AppShell>;
}

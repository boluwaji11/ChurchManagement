import { whereWeAre } from "@connectapp/env";

/**
 * HRT-402. Which set of records is behind this screen, on every screen.
 *
 * The admin portal has carried one since it was built. The product needs it
 * for the same reason and more sharply: the portal is one site a team member
 * opens on purpose, while this is a copy of the church-facing product, pixel
 * for pixel, sitting at an address one letter away from the real one. Without
 * a mark, the only thing telling somebody which of the two they are deleting
 * a member from is the address bar.
 *
 * Production draws nothing. A bar on every screen a church sees would be a
 * permanent stripe across a product that is theirs, and there is no second
 * production to confuse it with.
 */
/** Whether this deployment draws the bar at all. */
export function sandbox(): boolean {
  const here = whereWeAre();
  return !(here.environment === "production" && here.productionData);
}

export function SandboxBanner() {
  const here = whereWeAre();
  const live = here.environment === "production";

  if (!sandbox()) return null;

  /* Production serving records that are not production's own is a
     misconfiguration rather than a place, and says so in red. */
  const wrong = live;

  return (
    <div
      role="status"
      className={
        /* Sticky rather than fixed: it stays in the flow, so the height it
           takes is the height the viewport utilities give back, and it still
           never leaves the top of the window. Above the shells, which sit at
           z-20, so a sticky header scrolls under it. */
        "sticky top-0 z-50 flex h-[var(--env-bar,2rem)] w-full shrink-0 items-center justify-center gap-2 px-4 " +
        "text-[12px] font-semibold tracking-[0.14em] uppercase print:hidden " +
        (wrong ? "bg-danger text-white" : "bg-accent text-accent-fg")
      }
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {wrong ? "Production, other records" : "Sandbox"}
    </div>
  );
}

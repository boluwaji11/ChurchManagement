import { cn } from "@connectapp/ui";

/**
 * HRT-397, HRT-402. Which set of records is behind this screen, said on every
 * screen.
 *
 * It names production too. The earlier version stayed quiet there, on the
 * reasoning that a warning which fires every time is a warning nobody reads,
 * and that was the wrong trade for this product: a portal that says nothing is
 * a portal where the only way to know which records you are about to archive
 * is to remember which address you typed. So the bar is always there and the
 * question is never open. Production wears the chrome's own colour rather than
 * the accent, so it reads as a label rather than a warning.
 *
 * The sandbox is always called "Sandbox", whatever the deployment calls
 * itself. Vercel says preview, the repository says development and a laptop
 * says neither, and three names for one thing is how somebody ends up unsure
 * which one they are looking at.
 */
export function EnvironmentBar({
  environment,
  productionData,
}: {
  environment: string;
  productionData: boolean;
}) {
  const live = environment === "production";

  /* Production serving anything other than production's own records is worth
     naming exactly, because it is a misconfiguration rather than a place. */
  const wrong = live && !productionData;

  return (
    <div
      role="status"
      className={cn(
        /* Stays at the top of the window while the screen scrolls under it.
           Sticky rather than fixed, so it keeps its place in the layout. */
        "sticky top-0 z-50 flex h-9 w-full shrink-0 items-center justify-center gap-2.5",
        "text-[13px] font-semibold tracking-[0.14em] uppercase",
        wrong
          ? "bg-danger text-white"
          : live
            ? "bg-shell text-shell-fg"
            : "bg-accent text-accent-fg",
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {wrong ? "Production, other records" : live ? "Production" : "Sandbox"}
    </div>
  );
}

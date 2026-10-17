import { cn } from "@connectapp/ui";

/**
 * HRT-397, HRT-402. Which set of records is behind this screen, said once and
 * said loudly.
 *
 * Production is the ordinary case and says nothing: a warning that fires every
 * time is a warning nobody reads. Everything else gets this bar across the top
 * of the window, because a team member who believes they are in the sandbox
 * and is not would archive a real church.
 *
 * The word is always "Sandbox", whatever the deployment calls itself. Vercel
 * says preview, the repository says development and a laptop says neither, and
 * three names for one thing is how somebody ends up unsure which one they are
 * looking at.
 */
export function SandboxBar({
  environment,
  productionData,
}: {
  environment: string;
  productionData: boolean;
}) {
  if (environment === "production" && productionData) return null;

  /* Production serving anything other than production's own records is the
     one case worth naming exactly, because it is a misconfiguration rather
     than a place. */
  const wrong = environment === "production";

  return (
    <div
      role="status"
      className={cn(
        "flex h-9 w-full shrink-0 items-center justify-center gap-2.5",
        "text-[13px] font-semibold tracking-[0.14em] uppercase",
        wrong ? "bg-danger text-white" : "bg-accent text-accent-fg",
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {wrong ? "Production, other records" : "Sandbox"}
    </div>
  );
}

import { cn } from "@connectapp/ui";

/**
 * R21.x. The ConnectApp mark, the same three rising bars the product carries.
 *
 * Drawn rather than imported so it inherits the primary token and stays crisp
 * at any size, which is the same reason the product draws its own.
 */
export function Mark({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("flex items-end gap-[0.1875em]", className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[0.25em] rounded-full bg-primary-fg"
          style={{ height: `${0.55 + i * 0.225}em`, opacity: 0.45 + i * 0.275 }}
        />
      ))}
    </span>
  );
}

/**
 * The mark on its tile, with the name beside it.
 *
 * It says ConnectApp Admin rather than ConnectApp, because the one thing this
 * screen must never be mistaken for is a church's own.
 */
export function Brand({
  size = "sm",
  onShell,
}: {
  size?: "sm" | "md";
  /** Drawn on the rail's dark surface rather than on the page. */
  onShell?: boolean;
}) {
  const big = size === "md";

  return (
    <>
      <span
        className={cn(
          "grid shrink-0 place-items-center bg-primary",
          big ? "size-10 rounded-[11px]" : "size-9 rounded-[10px]",
          /* On the rail the tile and the surface behind it are both ink, so
             the tile needs an edge or the mark reads as floating. */
          onShell && "ring-1 ring-shell-line",
        )}
      >
        <Mark className={big ? "text-[1.25rem]" : "text-[1.125rem]"} />
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span
          className={cn(
            "font-display",
            big ? "text-[19px]" : "text-[17px]",
            onShell ? "text-shell-fg" : "text-fg",
          )}
        >
          ConnectApp
        </span>
        <span
          className={cn(
            "text-[12px] font-semibold tracking-[0.08em] uppercase",
            onShell ? "text-shell-muted" : "text-primary",
          )}
        >
          Admin
        </span>
      </span>
    </>
  );
}

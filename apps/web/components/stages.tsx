import { cn } from "@connectapp/ui";

/**
 * R24.6. A short run of stages across the top of something, and which one this is.
 *
 * The shape sign-up uses for starting a church, lifted out of it so anything
 * with two or three stages wears the same one. Somebody part way through wants
 * to know how many more there are: what is behind them is filled, what is ahead
 * is a hairline, and where they are wears a ring.
 *
 * The thread runs between the dots rather than under them, so the first stage
 * has nothing to its left and the last has nothing to its right, and the run
 * does not trail off the ends.
 */
export function Stages({ labels, at }: { labels: readonly string[]; at: number }) {
  return (
    <ol className="flex list-none items-start gap-0 p-0">
      {labels.map((label, i) => {
        const n = i + 1;
        const done = n < at;
        const here = n === at;

        return (
          <li key={label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <span className="flex w-full items-center">
              <span
                className={cn(
                  "h-0.5 flex-1 rounded-full",
                  i === 0 ? "bg-transparent" : done || here ? "bg-primary" : "bg-line",
                )}
              />
              <span
                aria-hidden
                className={cn(
                  "mx-1 size-3 shrink-0 rounded-full",
                  here ? "bg-primary ring-4 ring-primary/20" : done ? "bg-primary" : "bg-line",
                )}
              />
              <span
                className={cn(
                  "h-0.5 flex-1 rounded-full",
                  i === labels.length - 1 ? "bg-transparent" : done ? "bg-primary" : "bg-line",
                )}
              />
            </span>
            <span
              className={cn(
                "text-center text-[13px]",
                here ? "font-semibold text-fg" : "text-fg-subtle",
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

import { Tooltip, cn } from "@connectapp/ui";
import type { Health } from "./state-dot";

const TONE: Record<Health, string> = {
  pass: "bg-success",
  warn: "bg-warning",
  fail: "bg-danger",
  off: "bg-line-strong",
};

/**
 * HRT-394. One service's recent answers, oldest on the left.
 *
 * The shape every status page settles on, for a good reason: a column of
 * green dots answers "is it up" and this answers "has it been up", which is
 * the question somebody opening this screen at nine in the morning actually
 * has. A single failure three hours ago and a service that has been failing
 * for three hours look completely different here and identical on a light.
 */
export function Bars({
  checks,
  className,
}: {
  checks: { state: Health; at: Date; tookMs: number | null; said: string | null }[];
  className?: string;
}) {
  if (checks.length === 0) {
    return (
      <p className="text-caption text-fg-subtle">No checks recorded yet.</p>
    );
  }

  return (
    <div
      className={cn("flex h-7 items-end gap-[2px]", className)}
      role="img"
      aria-label={`The last ${checks.length} checks, oldest first. ${
        checks.filter((one) => one.state === "pass").length
      } passed.`}
    >
      {checks.map((check, i) => (
        <Tooltip
          key={`${check.at.toISOString()}-${i}`}
          content={`${check.at.toLocaleString("en-US", {
            day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
          })} · ${check.state}${check.tookMs === null ? "" : ` · ${check.tookMs}ms`}${
            check.said ? ` · ${check.said}` : ""
          }`}
        >
          <span
            className={cn(
              "h-full w-[6px] shrink-0 rounded-[2px]",
              TONE[check.state],
              /* A failure is drawn full height whatever its latency was: the
                 thing worth seeing from across the room is the red. */
              check.state === "pass" && "opacity-80",
            )}
          />
        </Tooltip>
      ))}
    </div>
  );
}

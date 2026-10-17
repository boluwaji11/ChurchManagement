import { AlertTriangle, Check, CircleSlash, X } from "lucide-react";
import { Tooltip, cn } from "@connectapp/ui";

export type Health = "pass" | "warn" | "fail" | "off";

/**
 * HRT-394, R24.6. What a service last said, as one mark.
 *
 * Colour is never the only signal: roughly one man in twelve is colour blind,
 * and some of them run this platform. Each state carries its own glyph as well
 * as its own colour, and the word is in the tooltip.
 */
const LOOK: Record<Health, { tone: string; icon: typeof Check; word: string }> = {
  pass: { tone: "bg-success-soft text-success-text", icon: Check, word: "Working" },
  warn: { tone: "bg-warning-soft text-warning-text", icon: AlertTriangle, word: "Slow or degraded" },
  fail: { tone: "bg-danger-soft text-danger-text", icon: X, word: "Not working" },
  off: { tone: "bg-sunken text-fg-subtle", icon: CircleSlash, word: "Not set up here" },
};

export function StateDot({ state, className }: { state: Health; className?: string }) {
  const look = LOOK[state];
  const Icon = look.icon;

  return (
    <Tooltip content={look.word}>
      <span
        className={cn("grid size-5 shrink-0 place-items-center rounded-full", look.tone, className)}
      >
        <Icon className="size-3" aria-hidden strokeWidth={2.5} />
        <span className="sr-only">{look.word}</span>
      </span>
    </Tooltip>
  );
}

/** The word for a state, where a screen has room for it. */
export const wordFor = (state: Health): string => LOOK[state].word;

/**
 * HRT-394. The state of a set of services is the worst one in it.
 *
 * `off` does not count as worse than `pass`: a service this environment has no
 * credential for is a fact about the environment rather than a fault, and
 * development would otherwise read as broken for its whole life.
 */
export function worst(states: Health[]): Health {
  if (states.includes("fail")) return "fail";
  if (states.includes("warn")) return "warn";
  if (states.some((one) => one === "pass")) return "pass";
  return "off";
}

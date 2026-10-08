import { t } from "@connectapp/i18n";
import type { MessageKey } from "@connectapp/i18n";

/**
 * R13.16. How far along a campaign is, and whether that is far enough.
 *
 * A bar on its own answers "how much" and leaves the question a treasurer
 * actually has. Six thousand of ten thousand is a good month in March and a
 * problem in December, so the colour is read from the money against the time
 * rather than from the money alone.
 *
 * The bar stops at the target. A campaign past it says so in its figures and
 * in its colour rather than by drawing wider than its own track.
 */

export type Pace = "waiting" | "open" | "ahead" | "onTrack" | "behind" | "short" | "met" | "ended";

/** The four signals, and the ink a campaign with no deadline runs in. */
const TONES: Record<Pace, { bar: string; tint: string; text: string }> = {
  waiting: { bar: "var(--fg-subtle)", tint: "var(--sunken)", text: "var(--fg-muted)" },
  open: { bar: "var(--primary)", tint: "var(--primary-soft)", text: "var(--primary)" },
  met: { bar: "var(--success)", tint: "var(--success-soft)", text: "var(--success-text)" },
  ahead: { bar: "var(--success)", tint: "var(--success-soft)", text: "var(--success-text)" },
  onTrack: { bar: "var(--success)", tint: "var(--success-soft)", text: "var(--success-text)" },
  behind: { bar: "var(--warning)", tint: "var(--warning-soft)", text: "var(--warning-text)" },
  short: { bar: "var(--danger)", tint: "var(--danger-soft)", text: "var(--danger-text)" },
  ended: { bar: "var(--danger)", tint: "var(--danger-soft)", text: "var(--danger-text)" },
};

export interface Standing {
  pace: Pace;
  /** How much of the target is in, as a share that may pass 1. */
  share: number;
  /** Where the campaign would be by now to finish on time, or null with no end. */
  expected: number | null;
  tone: { bar: string; tint: string; text: string };
  label: string;
}

const dayCount = (from: string, to: string) =>
  Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

/**
 * Where a campaign stands, as one answer.
 *
 * `today` is the church's own date, so a campaign closes on the evening its
 * congregation calls the end of the day rather than on the server's.
 */
export function standingOf({
  receivedCents,
  targetCents,
  startsOn,
  endsOn,
  today,
  archived,
}: {
  receivedCents: number;
  targetCents: number;
  startsOn: string;
  endsOn: string | null;
  today: string;
  archived?: boolean;
}): Standing {
  const share = targetCents > 0 ? receivedCents / targetCents : 0;
  const done = (pace: Pace, expected: number | null = null): Standing => ({
    pace, share, expected, tone: TONES[pace], label: t(`campaigns.pace.${pace}` as MessageKey),
  });

  if (targetCents <= 0) return done("open");
  if (share >= 1) return done("met");
  if (today < startsOn) return done("waiting");

  // Closed by hand, or past its last day, and the money did not arrive.
  if (archived || (endsOn && today > endsOn)) return done("ended");

  // R13.16. No end date is no deadline, so there is no pace to be behind.
  if (!endsOn) return done("open");

  const whole = Math.max(1, dayCount(startsOn, endsOn));
  const gone = Math.min(whole, Math.max(0, dayCount(startsOn, today)));
  const expected = gone / whole;

  if (expected <= 0) return done("onTrack", expected);
  const against = share / expected;
  if (against >= 1) return done("ahead", expected);
  if (against >= 0.9) return done("onTrack", expected);
  if (against >= 0.7) return done("behind", expected);
  return done("short", expected);
}

/**
 * The bar, with the pace marked on it.
 *
 * The notch is where the campaign would be today to finish on time, so the
 * colour has something on screen to be read against rather than asking
 * somebody to take our word for it.
 */
export function Progress({
  standing,
  height = 8,
}: {
  standing: Standing;
  height?: number;
}) {
  const filled = Math.round(Math.min(1, standing.share) * 100);
  const mark = standing.expected === null ? null : Math.round(standing.expected * 100);
  const notch = worthDrawing(mark) ? mark : null;

  return (
    <span
      aria-hidden
      className="relative block w-full overflow-hidden rounded-full bg-sunken"
      style={{ height }}
    >
      <span
        className="block h-full rounded-full transition-[width] duration-slow ease-out"
        style={{ width: `${filled}%`, background: standing.tone.bar }}
      />

      {notch === null ? null : (
        <span
          className="absolute top-0 bottom-0 w-px bg-fg/35"
          style={{ left: `${notch}%` }}
        />
      )}
    </span>
  );
}

/**
 * Whether the pace notch says anything the bar does not.
 *
 * One at either end is the bar's own edge drawn twice.
 */
function worthDrawing(mark: number | null): mark is number {
  return mark !== null && mark >= 5 && mark <= 96;
}

/** The pace in words, in its own colour, for whoever is not reading the bar. */
export function PaceChip({ standing }: { standing: Standing }) {
  return (
    <span
      className="inline-flex h-[22px] shrink-0 items-center rounded-full px-2.5 text-[11px] font-semibold whitespace-nowrap"
      style={{ background: standing.tone.tint, color: standing.tone.text }}
    >
      {standing.label}
    </span>
  );
}

/** How far along, as a figure. Rounded down, so 99.6% never reads as finished. */
export function percentOf(standing: Standing): string {
  return t("campaigns.percent", { percent: Math.floor(standing.share * 100) });
}

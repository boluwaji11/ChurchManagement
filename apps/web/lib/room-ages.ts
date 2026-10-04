import { t } from "@hearth/i18n";

/** Months as the church would say them: 24 is two years, 18 is eighteen months. */
export function say(months: number): { value: number; unit: "years" | "months" } {
  return months >= 12 && months % 12 === 0
    ? { value: months / 12, unit: "years" }
    : { value: months, unit: "months" };
}

/**
 * R8.14. The ages a room takes, in one line.
 *
 * Held in months, because the difference between a nursery that takes babies to
 * a year and one that takes them to eighteen months is the whole of that room's
 * staffing. Read back in whichever unit says it plainly.
 */
export function ageLine(room: {
  minAgeMonths: number | null;
  maxAgeMonths: number | null;
}): string | null {
  const { minAgeMonths: from, maxAgeMonths: to } = room;
  if (from === null && to === null) return null;

  if (from !== null && to !== null) {
    const a = say(from);
    const b = say(to);
    // One unit for the pair, so "0 to 2 years" never reads as "0 to 24 months".
    const unit = a.unit === b.unit ? a.unit : "months";
    const lo = unit === "years" ? from / 12 : from;
    const hi = unit === "years" ? to / 12 : to;
    return t(unit === "years" ? "rooms.age.years" : "rooms.age.months", { from: lo, to: hi });
  }

  if (to !== null) {
    const b = say(to);
    return t(b.unit === "years" ? "rooms.age.underYears" : "rooms.age.underMonths", { to: b.value });
  }

  const a = say(from!);
  return t(a.unit === "years" ? "rooms.age.overYears" : "rooms.age.overMonths", { from: a.value });
}

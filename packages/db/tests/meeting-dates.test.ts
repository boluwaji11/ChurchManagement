/**
 * HRT-90. When a group meets next (R9.2, R9.5).
 *
 * Worked out from the pattern rather than stored, because a church that has to
 * create fifty-two rows to say "Tuesdays" will stop saying it. Pure, so these
 * are the only tests it needs.
 */
import { describe, it, expect } from "vitest";
import { upcomingMeetings, meetingSentence } from "../src/repo/meeting-dates";

describe("the next few dates", () => {
  it("starts on the day itself when that is the day", () => {
    // 2026-10-06 is a Tuesday.
    expect(upcomingMeetings({ dayOfWeek: 2, frequency: "weekly" }, "2026-10-06", 3))
      .toEqual(["2026-10-06", "2026-10-13", "2026-10-20"]);
  });

  it("walks forward to the next one when it has passed this week", () => {
    // 2026-10-07 is a Wednesday, so the next Tuesday is the 13th.
    expect(upcomingMeetings({ dayOfWeek: 2, frequency: "weekly" }, "2026-10-07", 2))
      .toEqual(["2026-10-13", "2026-10-20"]);
  });

  it("counts a fortnight for a fortnightly group", () => {
    expect(upcomingMeetings({ dayOfWeek: 0, frequency: "fortnightly" }, "2026-10-04", 3))
      .toEqual(["2026-10-04", "2026-10-18", "2026-11-01"]);
  });

  it("keeps a monthly group on the same weekday rather than the same date", () => {
    // Four weeks, because "the first Tuesday" is how a church says monthly and
    // "the 6th" stops being a Tuesday next month.
    const dates = upcomingMeetings({ dayOfWeek: 2, frequency: "monthly" }, "2026-10-06", 3);
    expect(dates).toEqual(["2026-10-06", "2026-11-03", "2026-12-01"]);
    for (const date of dates) {
      expect(new Date(`${date}T00:00:00Z`).getUTCDay()).toBe(2);
    }
  });

  it("says nothing for a group with no pattern", () => {
    expect(upcomingMeetings({ dayOfWeek: null, frequency: "weekly" }, "2026-10-06")).toEqual([]);
    expect(upcomingMeetings({ dayOfWeek: 2, frequency: "weekly" }, "whenever")).toEqual([]);
  });
});

describe("the sentence", () => {
  const words = {
    day: (d: number) => ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d]!,
    time: (hhmm: string) => hhmm,
    frequency: (key: string) => key,
    template: ({ frequency, day, span }: { frequency: string; day: string; span: string }) =>
      `Meets ${frequency} on ${day}s, ${span}`,
  };

  it("reads the way somebody says it out", () => {
    expect(
      meetingSentence(
        { dayOfWeek: 0, frequency: "weekly", startsAt: "15:00", endsAt: "17:00" },
        words,
      ),
    ).toBe("Meets weekly on Sundays, 15:00 to 17:00");
  });

  it("leaves out an end nobody gave", () => {
    expect(
      meetingSentence({ dayOfWeek: 2, frequency: "monthly", startsAt: "19:30", endsAt: null }, words),
    ).toBe("Meets monthly on Tuesdays, 19:30");
  });

  it("says nothing at all for a group with no day", () => {
    expect(
      meetingSentence({ dayOfWeek: null, frequency: null, startsAt: null, endsAt: null }, words),
    ).toBe("");
  });
});

import { Lock } from "lucide-react";
import { t } from "@connectapp/i18n";
import type { TimelineEntry } from "@connectapp/db";
import { longDate } from "@/lib/dates";

/**
 * R2.15. What has happened with this person, in one order.
 *
 * Eight tables hold a person's record and none of them answers the question a
 * pastor asks before a visit. This does: a year on one screen, newest first.
 *
 * A line, a dot and a date. The dot carries the colour the thing already has
 * elsewhere in the product, so a group reads as that group here too (R24.4).
 */


function headline(entry: TimelineEntry): string {
  const name = entry.subject ?? "";
  switch (entry.kind) {
    case "added":
      return t("timeline.added");
    case "archived":
      return t("timeline.archived");
    case "attended":
      return t("timeline.attended", { name });
    case "checkedIn":
      return name ? t("timeline.checkedIn", { name }) : t("timeline.checkedInNoRoom");
    case "joinedGroup":
      return t("timeline.joinedGroup", { name });
    case "leftGroup":
      return t("timeline.leftGroup", { name });
    case "milestone":
      return t(`milestone.kind.${entry.code}` as never);
    case "note":
      // The note's own words are the entry. A line reading "Note" above them
      // says nothing the words underneath did not already say.
      return entry.detail ?? t("timeline.note");
    case "enteredPipeline":
      return t("timeline.enteredPipeline", { name });
    case "leftPipeline":
      return t("timeline.leftPipeline", { name });
    case "followUpDone":
      return name;
    case "check":
      return t("timeline.check");
  }
}

/**
 * R2.15. Everything that has happened with this person, in one order.
 *
 * The design's three columns: when it was down the left at a fixed 90px so the
 * dates line up, a dot in the hue of the kind of thing it was, then what
 * happened with its detail under it.
 */
export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-[13px] text-fg-muted">{t("timeline.empty")}</p>;
  }

  return (
    <ol className="flex flex-col">
      {entries.map((entry, i) => {
        const confidential = entry.kind === "note" && entry.code === "confidential";
        const first = i === 0;
        const last = i === entries.length - 1;

        return (
          // One thread running down the dots, so the entries read as one
          // sequence rather than as a stack of separate rows.
          <li
            key={entry.id}
            className="grid grid-cols-[90px_12px_1fr] items-start gap-3 pb-5 last:pb-0"
          >
            <span data-numeric className="pt-0.5 text-[12px] text-fg-subtle">
              {longDate(entry.on)}
            </span>

            <span aria-hidden className="relative h-full">
              <span
                className="absolute left-[5px] w-px bg-line"
                style={{ top: first ? 11 : 0, bottom: last ? "auto" : -20, height: last ? 0 : "auto" }}
              />
              <span
                className="absolute top-[5px] left-0 size-2.5 rounded-full"
                style={{
                  background: entry.hue
                    ? `var(--hue-${entry.hue}-500)`
                    : "var(--color-line-strong)",
                }}
              />
            </span>

            <div className="min-w-0">
              <div className="flex items-start gap-1.5">
                {confidential ? (
                  <Lock className="mt-1 size-3 shrink-0 text-fg-muted" aria-hidden />
                ) : null}
                <span className="font-medium text-fg">{headline(entry)}</span>
              </div>
              {entry.kind !== "note" && entry.detail ? (
                <div className="line-clamp-2 text-[13px] text-fg-muted">{entry.detail}</div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

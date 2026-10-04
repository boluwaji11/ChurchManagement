import { Lock } from "lucide-react";
import { t } from "@hearth/i18n";
import type { TimelineEntry } from "@hearth/db";
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
      return entry.code === "confidential"
        ? t("timeline.noteConfidential")
        : t("timeline.note");
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
      {entries.map((entry) => {
        const confidential = entry.kind === "note" && entry.code === "confidential";

        return (
          // A hairline under every entry so one date's row reads as one row,
          // which a two-line date made hard to see.
          <li
            key={entry.id}
            className="grid grid-cols-[90px_12px_1fr] items-start gap-3 border-b border-line py-3 first:pt-0 last:border-0 last:pb-0"
          >
            <span data-numeric className="pt-0.5 text-[12px] text-fg-subtle">
              {longDate(entry.on)}
            </span>

            <span
              aria-hidden
              className="mt-[5px] size-2.5 rounded-full"
              style={{
                background: entry.hue ? `var(--hue-${entry.hue}-500)` : "var(--color-line-strong)",
              }}
            />

            <div className="min-w-0">
              <div className="font-medium text-fg">{headline(entry)}</div>
              {entry.detail ? (
                <div className="flex items-start gap-1.5 text-[13px] text-fg-muted">
                  {confidential ? <Lock className="mt-0.5 size-3 shrink-0" aria-hidden /> : null}
                  <span className="line-clamp-2">{entry.detail}</span>
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

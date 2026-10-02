import {
  CalendarCheck, DoorOpen, Flag, FileText, Lock, ShieldCheck, UserPlus,
  Users, UserMinus, Route, CheckCircle2, Archive,
} from "lucide-react";
import { HueDot, type Hue } from "@hearth/ui";
import { t } from "@hearth/i18n";
import type { TimelineEntry, TimelineKind } from "@hearth/db";
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
const ICONS: Record<TimelineKind, typeof Flag> = {
  added: UserPlus,
  attended: CalendarCheck,
  checkedIn: DoorOpen,
  joinedGroup: Users,
  leftGroup: UserMinus,
  milestone: Flag,
  note: FileText,
  enteredPipeline: Route,
  leftPipeline: CheckCircle2,
  followUpDone: CheckCircle2,
  check: ShieldCheck,
  archived: Archive,
};

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

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-[length:var(--d-text-body)] text-fg-muted">{t("timeline.empty")}</p>;
  }

  return (
    <ol className="flex flex-col">
      {entries.map((entry, i) => {
        const Icon = ICONS[entry.kind];
        const confidential = entry.kind === "note" && entry.code === "confidential";

        return (
          <li key={entry.id} className="flex gap-3">
            {/* The spine. It runs between the dots rather than through them, so
                the last entry does not trail a line into nothing. */}
            <div className="flex flex-col items-center">
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface"
                aria-hidden
              >
                {entry.hue ? (
                  <HueDot hue={entry.hue as Hue} />
                ) : (
                  <Icon className="size-3.5 text-fg-muted" />
                )}
              </span>
              {i < entries.length - 1 ? <span className="w-px flex-1 bg-line" aria-hidden /> : null}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-0.5 pb-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-[length:var(--d-text-body)] text-fg">{headline(entry)}</span>
                <span data-numeric className="text-caption text-fg-subtle">
                  {longDate(entry.on)}
                </span>
              </div>

              {entry.detail ? (
                <span className="flex items-start gap-1.5 text-caption text-fg-muted">
                  {confidential ? <Lock className="mt-0.5 size-3 shrink-0" aria-hidden /> : null}
                  <span className="line-clamp-2">{entry.detail}</span>
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

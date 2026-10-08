import { Badge } from "@connectapp/ui";
import { t, plural } from "@connectapp/i18n";
import type { PublicGroup } from "@connectapp/db";

const dayName = (day: number) =>
  new Date(2024, 0, 7 + day).toLocaleDateString(undefined, { weekday: "long" });

const readableTime = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const at = new Date();
  at.setHours(h ?? 0, m ?? 0, 0, 0);
  return at
    .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true })
    .toLowerCase();
};

/** R9.5. "Tuesdays, 7:30pm to 9pm", which is what somebody needs to know first. */
export function meetsWhen(group: PublicGroup): string {
  if (group.dayOfWeek === null) return group.location ?? "";
  const day = `${dayName(group.dayOfWeek)}s`;
  if (!group.startsAt) return day;
  const span = group.endsAt
    ? `${readableTime(group.startsAt)} to ${readableTime(group.endsAt)}`
    : readableTime(group.startsAt);
  return `${day}, ${span}`;
}

/** R9.5. When, where, who it is for, and whether it is taking members. */
export function GroupLine({ group }: { group: PublicGroup }) {
  return (
    <>
      <span className="text-[length:var(--d-text-body)] text-fg-muted">
        {meetsWhen(group)}
        {/* "Tuesdays, 7:30pm to 9pm, the foyer". A bare space ran the time
            into the place and read as one phrase. */}
        {group.dayOfWeek !== null && group.location ? `, ${group.location}` : ""}
      </span>

      {/* R9.5. The church's own word for who it is for, rather than the
          value the column holds. */}
      {group.forWhom ? (
        <span className="text-caption text-fg-muted">
          {t(`groups.audience.${group.forWhom}` as never)}
        </span>
      ) : null}

      <span className="mt-1 flex flex-wrap items-center gap-2">
        <span className="text-caption text-fg-muted tabular-nums">
          {plural("publicGroups.size", group.memberCount)}
        </span>
        {group.online ? <Badge tone="neutral">{t("publicGroups.online")}</Badge> : null}
        {group.childrenWelcome ? (
          <Badge tone="neutral">{t("publicGroups.children")}</Badge>
        ) : null}
        {group.full ? (
          <Badge tone="warning">{t("publicGroups.full")}</Badge>
        ) : group.openToJoin ? (
          <Badge tone="success">{t("publicGroups.open")}</Badge>
        ) : null}
      </span>
    </>
  );
}

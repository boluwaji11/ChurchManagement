import { Badge } from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import type { PublicGroup } from "@hearth/db";

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

/** R9.5. When, where, who it is for, and whether it is taking people. */
export function GroupLine({ group }: { group: PublicGroup }) {
  return (
    <>
      <span className="text-[length:var(--d-text-body)] text-fg-muted">
        {meetsWhen(group)}
        {group.dayOfWeek !== null && group.location ? ` ${group.location}` : ""}
      </span>

      {group.forWhom ? (
        <span className="text-caption text-fg-muted">{group.forWhom}</span>
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

import { Card, EmptyState } from "@hearth/ui";
import { t } from "@hearth/i18n";
import type { PlanChange } from "@hearth/db";

/** The fields worth naming. Anything else is reported as a change without one. */
const NAMED = new Set([
  "title", "kind", "minutes", "description", "position",
  "series", "theme", "body", "label", "team_id", "position_id", "person_id",
]);

const named = (fields: string[]): string => {
  const words = fields
    .filter((field) => NAMED.has(field))
    .map((field) => t(`history.field.${field}` as never));
  return [...new Set(words)].join(", ");
};

const when = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

/**
 * R11.12. Who changed what, and when.
 *
 * Worship leaders change plans the night before a gathering, and the question
 * on a service morning is which of the eight people with the password did it.
 */
export function History({ changes }: { changes: PlanChange[] }) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <span className="font-display text-heading text-fg">{t("history.title")}</span>

      {changes.length === 0 ? (
        <EmptyState title={t("history.empty")} />
      ) : (
        <ul className="flex flex-col gap-2">
          {changes.map((change) => {
            const what = change.subject ?? t("history.plan");
            const fields = named(change.fields);

            const line =
              change.action === "insert"
                ? t("history.insert", { what })
                : change.action === "delete"
                  ? t("history.delete", { what })
                  : t("history.update", { fields, what });

            return (
              <li key={change.id} className="flex flex-col">
                <span className="text-[length:var(--d-text-body)] text-fg">{line}</span>
                <span className="text-caption text-fg-muted">
                  {t("history.by", {
                    who: change.actorName ?? t(`role.${change.actorRole ?? "member"}` as never),
                    when: when(change.at),
                  })}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

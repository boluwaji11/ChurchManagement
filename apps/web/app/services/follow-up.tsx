import Link from "next/link";
import { Badge, Card, CardTitle, Separator } from "@hearth/ui";
import { t } from "@hearth/i18n";

export interface FollowUpPerson {
  personId: string;
  name: string;
  detail: string;
  badge?: string;
}

/**
 * R7.5 and R7.6. The two lists somebody works through on a Monday.
 *
 * Side by side, because they are the same job from two directions: people the
 * church has not met yet, and people it has stopped seeing. The pipelines in
 * R5.3 will act on both, and until they exist this is the whole of follow-up.
 */
export function FollowUp({
  church,
  newcomers,
  absent,
}: {
  church: string;
  newcomers: FollowUpPerson[];
  absent: FollowUpPerson[];
}) {
  const column = (title: string, rows: FollowUpPerson[], empty: string) => (
    <Card>
      <CardTitle>{title}</CardTitle>
      <Separator className="my-4" />
      {rows.length === 0 ? (
        <p className="text-[length:var(--d-text-body)] text-fg-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.personId}>
              <Link
                href={`/people/${row.personId}?church=${church}`}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-canvas p-2.5 hover:bg-sunken"
              >
                <span className="text-[length:var(--d-text-body)] text-fg">{row.name}</span>
                {row.badge ? <Badge tone="accent">{row.badge}</Badge> : null}
                <span className="text-caption text-fg-muted">{row.detail}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {column(t("newcomers.title"), newcomers, t("newcomers.none"))}
      {column(t("absent.title"), absent, t("absent.none"))}
    </div>
  );
}

import Link from "next/link";
import { UserPlus, UserMinus } from "lucide-react";
import { Card, CardTitle, Separator } from "@hearth/ui";
import { t } from "@hearth/i18n";

export interface FollowUpPerson {
  personId: string;
  name: string;
  detail: string;
  note?: string;
}

/**
 * R7.5 and R7.6. The two lists somebody works through on a Monday.
 *
 * Below the services, because the page is for recording what happened and this
 * is what the record then tells you. One card rather than two, quiet rather
 * than loud: these are prompts, and a prompt that shouts over the day's work is
 * a prompt people learn to scroll past.
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
  const column = (
    icon: React.ReactNode,
    title: string,
    rows: FollowUpPerson[],
    empty: string,
  ) => (
    <div className="flex flex-col gap-3">
      <h3 className="flex items-center gap-2 text-label text-fg-muted">
        {icon}
        {title}
      </h3>

      {rows.length === 0 ? (
        <p className="text-[length:var(--d-text-body)] text-fg-subtle">{empty}</p>
      ) : (
        <ul className="flex flex-col">
          {rows.map((row) => (
            <li key={row.personId}>
              <Link
                href={`/people/${row.personId}?church=${church}`}
                className="-mx-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 rounded-md px-2 py-1.5 hover:bg-sunken"
              >
                <span className="text-[length:var(--d-text-body)] text-fg">{row.name}</span>
                <span className="text-caption text-fg-muted">
                  {row.note ? `${row.note} · ` : ""}
                  {row.detail}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <Card>
      <CardTitle>{t("followUp.title")}</CardTitle>
      <Separator className="my-4" />
      <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
        {column(
          <UserPlus className="size-4" aria-hidden />,
          t("newcomers.title"),
          newcomers,
          t("newcomers.none"),
        )}
        {column(
          <UserMinus className="size-4" aria-hidden />,
          t("absent.title"),
          absent,
          t("absent.none"),
        )}
      </div>
    </Card>
  );
}

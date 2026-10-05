import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { t } from "@connectapp/i18n";

export interface TypeCard {
  id: string;
  name: string;
  description: string | null;
  hue: string;
  /** How many groups the church has of this kind, for deciding to show it. */
  all: number;
}

/**
 * R9.5. The kinds of group a church runs, before any one group.
 *
 * A church with sixty groups does not have one list, it has three or four
 * things it calls by name: Life Groups, the Dream Team, Youth. Somebody
 * arriving is choosing between those, not scrolling sixty rows, so the kinds
 * lead and the list is what a choice opens.
 *
 * The words are the church's own: the name and the description on the group
 * type, set in Settings. That is why the description field is there.
 */
export function TypesLanding({
  church,
  types,
}: {
  church: string;
  types: TypeCard[];
}) {
  return (
    <div className="flex flex-col divide-y divide-line">
      {types.map((one) => (
        <Link
          key={one.id}
          href={`/groups?church=${church}&type=${one.id}`}
          className="group flex items-start gap-4 py-6"
        >
          <span
            aria-hidden
            className="mt-1.5 h-10 w-1.5 shrink-0 rounded-full"
            style={{ background: `var(--hue-${one.hue}-500)` }}
          />

          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="font-display text-[22px] leading-7 text-fg group-hover:text-primary">
              {one.name}
            </span>

            {one.description ? (
              <span className="line-clamp-3 text-[length:var(--d-text-body)] text-fg-muted">
                {one.description}
              </span>
            ) : null}
          </span>

          <ArrowRight
            className="mt-2 size-4 shrink-0 text-fg-subtle group-hover:text-primary"
            aria-hidden
          />
        </Link>
      ))}

      {/* Whatever has no kind on it, and the way to the whole list. */}
      <Link
        href={`/groups?church=${church}&type=all`}
        className="flex items-center gap-2 py-5 text-[length:var(--d-text-body)] font-medium text-primary"
      >
        {t("groupType.everything")} <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}

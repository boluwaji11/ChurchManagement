import { Printer } from "lucide-react";
import { money, groupAmount } from "@/lib/money";
import { longDate } from "@/lib/dates";
import { t } from "@connectapp/i18n";
import { Tooltip } from "@connectapp/ui";
import { StartCount } from "./start-count";

/** What a card needs off a counting session. */
export interface CountCard {
  id: string;
  slug: string;
  name: string;
  receivedOn: string;
  fundId: string | null;
  funds: string;
  /** A comma separated list of the methods counted. */
  methods: string;
  method: string;
  enteredCents: number;
}

/**
 * R13.6, R24.6. The counting sessions as they read on a phone.
 *
 * Six columns against four hundred pixels is a table nobody reads sideways,
 * so the same rows stack: the session's own name and what was counted on
 * the first line, the date, the funds and the methods under it.
 */
export function CountCards({
  counts,
  church,
  today,
  funds,
  firstFundId,
  manage,
}: {
  counts: CountCard[];
  church: string;
  today: string;
  funds: { id: string; name: string }[];
  /** What a session with no fund of its own opens on. */
  firstFundId: string;
  /** R13.6. Whether this reader may open a session to put it right. */
  manage: boolean;
}) {
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {counts.map((count) => (
        <li
          key={count.id}
          className="relative flex flex-col gap-1 border-t border-line px-4 py-3 first:border-0"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="min-w-0 flex-1 font-medium text-fg">
              {manage ? (
                <StartCount
                  church={church}
                  today={today}
                  funds={funds}
                  count={{
                    id: count.id,
                    name: count.name,
                    receivedOn: count.receivedOn,
                    fundId: count.fundId ?? firstFundId,
                    method: count.method,
                    amount: groupAmount((count.enteredCents / 100).toFixed(2)),
                  }}
                  trigger={
                    <button
                      type="button"
                      className="cursor-pointer text-left after:absolute after:inset-0 after:content-['']"
                    >
                      {count.name}
                    </button>
                  }
                />
              ) : (
                count.name
              )}
            </span>

            <span data-numeric className="shrink-0 font-semibold text-fg">
              {money(count.enteredCents)}
            </span>
          </div>

          <div className="flex items-end justify-between gap-3">
            <span className="min-w-0 flex-1 text-[12px] text-fg-subtle">
              {[
                longDate(count.receivedOn),
                count.funds,
                count.methods
                  .split(",")
                  .filter(Boolean)
                  .map((one) => t(`giving.method.${one}` as never))
                  .join(", "),
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>

            {/* The slip sits above the link that covers the card. */}
            <span className="relative z-10 shrink-0">
              <Tooltip content={t("giving.count.slip")}>
                <a
                  href={`/giving/counts/${count.slug}/slip?church=${church}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={t("giving.count.slip")}
                  className="inline-flex size-9 items-center justify-center rounded-[var(--d-radius-control)] text-fg-muted hover:bg-surface hover:text-fg [&_svg]:size-4"
                >
                  <Printer />
                </a>
              </Tooltip>
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

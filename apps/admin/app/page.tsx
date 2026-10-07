import Link from "next/link";
import { platform } from "@connectapp/db";
import { requireOperator } from "@/lib/admin";
import { Shell } from "@/components/shell";
import { Since } from "@/components/since";

export const dynamic = "force-dynamic";

export const metadata = { title: "Overview - ConnectApp Admin" };

/**
 * R22.x. The numbers the platform is run on.
 *
 * Six figures and the last ten things anybody did. The one that matters most is
 * provisional: every church in it is a church waiting on a person, and the
 * sixty-minute promise is made of that number being small.
 */
export default async function SignalsPage() {
  const who = await requireOperator();
  const [signals, recent] = await Promise.all([
    platform.signals(who.id),
    platform.events(who.id, { limit: 10 }),
  ]);

  const tiles = [
    { label: "Churches", value: signals.churches, hint: "live on the platform" },
    { label: "Waiting on a person", value: signals.provisional, hint: "provisional, capped at 25", href: "/churches?standing=provisional" },
    { label: "Active in 12 weeks", value: signals.active, hint: "recorded something" },
    { label: "Members held", value: signals.members, hint: "across every church" },
    { label: "Accounts", value: signals.accounts, hint: "that can sign in" },
    { label: "New this month", value: signals.newThisMonth, hint: "churches created" },
    { label: "Archived", value: signals.archived, hint: "out of service", href: "/churches?standing=archived" },
  ];

  return (
    <Shell who={who} title="Signals" lede="Where the platform stands today.">
      <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(210px,1fr))]">
        {tiles.map((tile) => {
          const body = (
            <>
              <span className="text-[13px] font-medium text-fg-muted">{tile.label}</span>
              <span
                data-numeric
                className="font-display text-[34px] leading-none text-fg tabular-nums"
              >
                {tile.value}
              </span>
              <span className="text-[12px] text-fg-subtle">{tile.hint}</span>
            </>
          );

          return tile.href ? (
            <Link
              key={tile.label}
              href={tile.href}
              className="flex flex-col gap-2 rounded-[16px] border border-line bg-surface p-5 no-underline transition-shadow duration-fast hover:shadow-md"
            >
              {body}
            </Link>
          ) : (
            <div
              key={tile.label}
              className="flex flex-col gap-2 rounded-[16px] border border-line bg-surface p-5"
            >
              {body}
            </div>
          );
        })}
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-[20px] text-fg">Lately</h2>
          <Link href="/log" className="text-[13px] font-medium text-primary">
            The whole log
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="rounded-[16px] border border-dashed border-line-strong p-6 text-center text-[length:var(--d-text-body)] text-fg-muted">
            Nothing has been done here yet.
          </p>
        ) : (
          /* R24.6. The same path the product draws: a mark a row, the line
             between them carrying its own dot. */
          <ol className="m-0 flex list-none flex-col p-0">
            {recent.map((event, i) => (
              <li key={event.id} className="flex gap-3">
                <span className="flex w-5 shrink-0 flex-col items-center" aria-hidden>
                  <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-primary" />
                  {i === recent.length - 1 ? null : (
                    <span className="relative my-1 w-px flex-1 bg-primary/35">
                      <span className="absolute top-1/2 left-1/2 size-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/60" />
                    </span>
                  )}
                </span>

                <span className="flex min-w-0 flex-1 flex-col gap-0.5 pb-5">
                  <span className="text-[length:var(--d-text-body)] text-fg">
                    <b className="font-semibold">{event.actorName}</b> {event.action}
                    {event.tenantName ? (
                      <>
                        {" "}
                        <Link
                          href={`/churches/${event.tenantId}`}
                          className="font-medium text-primary"
                        >
                          {event.tenantName}
                        </Link>
                      </>
                    ) : null}
                  </span>
                  <span className="text-[12px] text-fg-subtle">
                    <Since at={event.at} />
                    {event.note ? ` · ${event.note}` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </Shell>
  );
}

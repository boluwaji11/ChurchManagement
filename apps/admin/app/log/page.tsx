import Link from "next/link";
import { platform } from "@connectapp/db";
import { requireOperator } from "@/lib/admin";
import { Shell } from "@/components/shell";
import { Since } from "@/components/since";

export const dynamic = "force-dynamic";

/**
 * R21.x. Everything the operators have done, append only.
 *
 * The same rule a church's own audit log follows: nothing here can be edited or
 * deleted by anybody, including the person who wrote it.
 */
export default async function LogPage() {
  const who = await requireOperator();
  const log = await platform.events(who.id, { limit: 200 });

  return (
    <Shell who={who} title="Log" lede="What the operators have done, newest first.">
      {log.length === 0 ? (
        <p className="rounded-[16px] border border-dashed border-line-strong p-10 text-center text-[length:var(--d-text-body)] text-fg-muted">
          Nothing has been done here yet.
        </p>
      ) : (
        <ol className="m-0 flex list-none flex-col p-0">
          {log.map((event, i) => (
            <li key={event.id} className="flex gap-3">
              <span className="flex w-5 shrink-0 flex-col items-center" aria-hidden>
                <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-primary" />
                {i === log.length - 1 ? null : (
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
                      <Link href={`/churches/${event.tenantId}`} className="font-medium text-primary">
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
    </Shell>
  );
}

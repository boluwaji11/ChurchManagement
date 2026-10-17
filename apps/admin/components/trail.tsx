import Link from "next/link";
import type { platform } from "@connectapp/db";
import { Since } from "./since";

type Event = Awaited<ReturnType<typeof platform.events>>[number];

/**
 * R24.6. What has been done, down a line with a mark on each entry.
 *
 * Written once. The overview, the log and a church's own record each drew this
 * list from scratch, three copies of twenty lines of markup that had already
 * started to differ: one of them had stopped linking the church's name.
 */
export function Trail({
  events,
  /** On a church's own screen the church is not worth naming on every row. */
  withoutChurch,
}: {
  events: Event[];
  withoutChurch?: boolean;
}) {
  return (
    <ol className="m-0 flex list-none flex-col p-0">
      {events.map((event, i) => (
        <li key={event.id} className="flex gap-3">
          <span className="flex w-5 shrink-0 flex-col items-center" aria-hidden>
            <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-primary" />
            {i === events.length - 1 ? null : (
              <span className="relative my-1 w-px flex-1 bg-primary/35">
                <span className="absolute top-1/2 left-1/2 size-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/60" />
              </span>
            )}
          </span>

          <span className="flex min-w-0 flex-1 flex-col gap-0.5 pb-5">
            <span className="text-body text-fg">
              <b className="font-semibold">{event.actorName}</b> {event.action}
              {withoutChurch ? " it" : null}
              {!withoutChurch && event.tenantName ? (
                <>
                  {" "}
                  <Link href={`/churches/${event.tenantId}`} className="font-medium text-primary">
                    {event.tenantName}
                  </Link>
                </>
              ) : null}
            </span>
            <span className="text-caption text-fg-subtle">
              <Since at={event.at} />
              {event.note ? ` · ${event.note}` : ""}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

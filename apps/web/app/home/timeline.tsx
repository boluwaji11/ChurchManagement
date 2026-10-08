import Link from "next/link";
import * as React from "react";

/**
 * R17.1, R24.4. The pieces a member's home screen is built from.
 *
 * Two ideas carry the screen. A block is a card with its own mark, the shape
 * the rest of the product uses, so a member reading this and a volunteer
 * reading the staff screens are reading one product. And what is coming up
 * is drawn as a thread rather than as a list of rows: a member's month with
 * their church is one sequence, and the eye follows a line down it faster
 * than it reads six boxes.
 *
 * The colour on the thread belongs to the thing. A Worship date wears the
 * Worship team's hue and the harvest supper wears the event's own, so two
 * services and a supper are told apart before a word is read. Nothing here
 * is coloured for decoration.
 */

/** One block of the screen: a mark, a name, and its own way through. */
export function Block({
  icon,
  title,
  action,
  children,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  /** The link out of it, on the heading's own line. */
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex min-w-0 flex-col rounded-2xl border border-line bg-surface ${className ?? ""}`}
    >
      <header className="flex flex-wrap items-center gap-3 px-5 py-4">
        {/* R1.1. The church's colour, which the frame sets. */}
        <span
          className="grid size-9 shrink-0 place-items-center rounded-[10px] [&_svg]:size-[18px]"
          style={{ background: "var(--brand-tint)", color: "var(--brand-key)" }}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-fg">{title}</span>
        {action ? <span className="shrink-0">{action}</span> : null}
      </header>

      {children ? (
        <>
          <hr className="border-0 border-t border-line" />
          {children}
        </>
      ) : null}
    </section>
  );
}

/** The link out of a block, as it reads on the heading's line. */
export function Through({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex min-h-9 items-center rounded-[var(--d-radius-control)] px-2 text-[13px] font-medium text-primary underline underline-offset-4 hover:bg-sunken"
    >
      {children}
    </Link>
  );
}

/** What one stop on the thread is made of. */
export interface Stop {
  id: string;
  /** The hue of the thing it is, which is what marks it. */
  hue: string;
  icon: React.ReactNode;
  /** The date and time, above the name, because the thread is chronological. */
  when: string;
  title: string;
  /** Where, who with, whatever the line needs after its name. */
  detail?: string | null;
  /** R24.6. Where the whole stop goes, when it stands for something openable. */
  href?: string;
  /** R24.6. Its own controls, such as the answer a serving request wants. */
  action?: React.ReactNode;
}

/**
 * R17.1, R24.4. What is coming up, as one thread.
 *
 * The rail runs between the marks rather than past the last one, so it reads
 * as a sequence closing rather than a line falling off the bottom of a card.
 */
export function Thread({ stops }: { stops: Stop[] }) {
  return (
    <ol className="m-0 flex list-none flex-col p-0">
      {stops.map((stop, at) => {
        const last = at === stops.length - 1;

        const body = (
          <>
            {/* The thread is drawn in two pieces per stop, one reaching up
                into this row's own padding and one filling what is left
                below the mark, so the line crosses the gap between rows
                instead of stopping short of the next one. */}
            <span className="flex w-9 shrink-0 flex-col items-center self-stretch" aria-hidden>
              <span className={`h-3 w-px ${at === 0 ? "" : "bg-line"}`} />
              <span
                className="grid size-9 shrink-0 place-items-center rounded-[10px] [&_svg]:size-[18px]"
                style={{
                  background: `var(--hue-${stop.hue}-tint)`,
                  color: `var(--hue-${stop.hue}-key)`,
                }}
              >
                {stop.icon}
              </span>
              <span className={`w-px flex-1 ${last ? "" : "bg-line"}`} />
            </span>

            <span className="flex min-w-0 flex-1 flex-col gap-0.5 py-3 leading-5">
              <span className="text-caption font-medium text-fg-subtle">{stop.when}</span>
              <span className="truncate font-medium text-fg">{stop.title}</span>
              {stop.detail ? (
                <span className="truncate text-caption text-fg-muted">{stop.detail}</span>
              ) : null}
            </span>

            {stop.action ? <span className="shrink-0 py-3">{stop.action}</span> : null}
          </>
        );

        return (
          <li key={stop.id} className="flex min-w-0 flex-col">
            {stop.href ? (
              /* R24.6. The whole stop opens it, not the name alone. */
              <Link href={stop.href} className="flex gap-3.5 px-5 hover:bg-sunken">
                {body}
              </Link>
            ) : (
              <span className="flex gap-3.5 px-5">{body}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** What a block says when it is holding nothing. */
export function Quiet({ children }: { children: React.ReactNode }) {
  return <p className="m-0 px-5 py-7 text-center text-[length:var(--d-text-body)] text-fg-muted">{children}</p>;
}

/**
 * R24.4. A short thread, for the standing facts down the side.
 *
 * The groups a member is in and the people in their household are both a
 * handful of lines under a heading, and the same rail ties them together.
 */
export function SideThread({
  rows,
}: {
  rows: {
    id: string;
    /** Given where the row stands for something with a colour of its own. */
    hue?: string | null;
    label: string;
    note?: string | null;
    href?: string;
  }[];
}) {
  return (
    <ul className="m-0 flex list-none flex-col px-5 py-2">
      {rows.map((row, at) => {
        const last = at === rows.length - 1;

        const body = (
          <>
            {/* The same two pieces. Nothing hangs above the first dot, which
                would read as a line coming from somewhere off the card. */}
            <span className="flex w-2.5 shrink-0 flex-col items-center self-stretch" aria-hidden>
              <span className={`h-[17px] w-px ${at === 0 ? "" : "bg-line"}`} />
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ background: `var(--hue-${row.hue ?? "indigo"}-500)` }}
              />
              <span className={`w-px flex-1 ${last ? "" : "bg-line"}`} />
            </span>

            {/* The role goes under the name. A 320px column cannot hold
                "Member Riverside" and "Head of household" on one line, and
                the name is the half that was being cut. */}
            <span className="flex min-w-0 flex-1 flex-col py-2 leading-5">
              <span className="min-w-0 truncate font-medium text-fg">{row.label}</span>
              {row.note ? (
                <span className="truncate text-caption text-fg-subtle">{row.note}</span>
              ) : null}
            </span>
          </>
        );

        return (
          <li key={row.id} className="flex min-w-0">
            {row.href ? (
              <Link href={row.href} className="flex min-w-0 flex-1 gap-3 hover:text-primary">
                {body}
              </Link>
            ) : (
              <span className="flex min-w-0 flex-1 gap-3">{body}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

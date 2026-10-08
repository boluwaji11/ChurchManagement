import Link from "next/link";
import { ChevronRight } from "lucide-react";
import * as React from "react";

/**
 * R13.21, R24.6. One block of the giving screen.
 *
 * The screen was two tables and a thin column of loose cards, which read as
 * one wall. Each thing a treasurer comes for is its own panel now: a mark, a
 * name, what it holds, and its own actions on its own line, so the eye can
 * find the counting sessions without reading the gifts first.
 */
export function Panel({
  icon,
  title,
  count,
  action,
  children,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  /** What is in it, read before opening anything. */
  count?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex min-w-0 flex-col rounded-[14px] border border-line bg-surface shadow-sm ${className ?? ""}`}
    >
      <header className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-primary-soft text-primary [&_svg]:size-[18px]">
          {icon}
        </span>

        <span className="flex min-w-0 flex-1 flex-col leading-5">
          <span className="text-[15px] font-bold text-fg">{title}</span>
          {count ? <span className="truncate text-[13px] text-fg-muted">{count}</span> : null}
        </span>

        {action ? <span className="flex flex-wrap items-center gap-2">{action}</span> : null}
      </header>

      <hr className="border-0 border-t border-line" />

      {children}
    </section>
  );
}

/** What a panel says when it is holding nothing yet. */
export function Nothing({ children }: { children: React.ReactNode }) {
  return <p className="m-0 px-5 py-10 text-center text-fg-muted">{children}</p>;
}

/**
 * R13.21. One of the places this screen leads, as a tile.
 *
 * Payouts, campaigns and statements were three small links wedged into the
 * side of a heading that was about something else. They are months of a
 * treasurer's year, so each gets its own mark and a figure that makes it
 * worth the room.
 */
export function Destination({
  icon,
  title,
  detail,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  /** One live figure, so the tile says something rather than just pointing. */
  detail: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-w-0 items-center gap-3 rounded-[14px] border border-line bg-surface px-4 py-3.5 no-underline shadow-sm transition-colors duration-instant hover:border-line-strong hover:bg-sunken"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-primary-soft text-primary [&_svg]:size-[18px]">
        {icon}
      </span>

      <span className="flex min-w-0 flex-1 flex-col leading-5">
        <span className="truncate text-[15px] font-bold text-fg">{title}</span>
        <span className="truncate text-[13px] text-fg-muted">{detail}</span>
      </span>

      <ChevronRight
        aria-hidden
        className="size-4 shrink-0 text-fg-subtle transition-transform duration-instant group-hover:translate-x-0.5"
      />
    </Link>
  );
}

/**
 * R13.15. The rail that ties a line to the one above it.
 *
 * A refund belongs to its gift the way a step belongs to the thing it is a
 * step of, so it is drawn the way the rest of the product draws that: a dot
 * on the parent, a line down the gutter, an elbow into the child. An arrow
 * glyph in the date column said the same thing in a place nobody looks.
 */
export function Rail({ role }: { role: "parent" | "child" }) {
  if (role === "parent") {
    return (
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 flex w-7 justify-center">
        <span className="relative w-px bg-line-strong">
          <span className="absolute -top-px left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-primary" />
        </span>
      </span>
    );
  }

  return (
    <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 flex w-7 justify-center">
      {/* Down to the middle of the row, then out to meet the line. */}
      <span className="relative h-1/2 w-px bg-line-strong">
        <span className="absolute bottom-0 left-0 h-px w-2.5 bg-line-strong" />
      </span>
    </span>
  );
}

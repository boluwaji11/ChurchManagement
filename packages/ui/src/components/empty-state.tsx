import * as React from "react";
import { cn } from "../lib/cn";

/**
 * R24.17. A screen with nothing on it yet.
 *
 * The church's own mark, what is missing, and the way to put something there.
 * A church's first week in the product should read as an invitation, and the
 * action that fills the screen belongs here rather than only in the corner:
 * this is where the reader is already looking.
 */
export function EmptyState({
  mark,
  title,
  body,
  action,
  className,
}: {
  /** The church's logo, or an icon naming what is missing. */
  mark?: React.ReactNode;
  title: string;
  /** Only where the title leaves something unanswered. Most do not. */
  body?: string;
  /** What fills the screen. The same button the page carries in its corner. */
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-[14px] border border-dashed border-line-strong",
        "bg-sunken/40 px-6 py-14 text-center",
        className,
      )}
    >
      {mark}

      <div className="flex max-w-sm flex-col gap-1.5">
        <h3 className="font-display text-heading text-fg">{title}</h3>
        {body ? <p className="text-[length:var(--d-text-body)] text-fg-muted">{body}</p> : null}
      </div>

      {action ? <div className="flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
    </div>
  );
}

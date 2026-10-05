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
        // No outline. A dashed box drawn around nothing says the screen is
        // broken rather than new, and the mark and the words carry it.
        "flex flex-col items-center justify-center gap-4 rounded-[14px]",
        "px-6 py-14 text-center",
        className,
      )}
    >
      {mark}

      <div className="flex max-w-sm flex-col gap-1.5">
        {/* R24.17. Body text rather than a heading. An empty screen is saying
            there is nothing here yet, which is a quiet sentence. Set in
            Fraunces at heading weight it read as an announcement, and the one
            thing on an empty screen that should carry weight is the action
            under it. */}
        <h3 className="text-[15px] font-normal text-fg-muted">{title}</h3>
        {body ? <p className="text-[length:var(--d-text-body)] text-fg-muted">{body}</p> : null}
      </div>

      {action ? <div className="flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
    </div>
  );
}

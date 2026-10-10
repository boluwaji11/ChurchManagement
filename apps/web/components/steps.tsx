"use client";

import * as React from "react";

/**
 * R24.6. A short run of steps with a thread running between them.
 *
 * The shape the product uses wherever a church has to do two or three things
 * in order and wants to see which of them are behind it: connecting a giving
 * account, pointing a domain. A done step goes green, and the thread stops at
 * the last one so the list does not trail off into nothing.
 */
export function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="m-0 flex list-none flex-col p-0">{children}</ol>;
}

export function Step({
  icon,
  title,
  done,
  last,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  /** R24.6. Green where the step is behind the church rather than ahead of it. */
  done?: boolean;
  last?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="flex w-6 shrink-0 flex-col items-center" aria-hidden>
        <span
          className="grid size-6 shrink-0 place-items-center rounded-full [&_svg]:size-3.5"
          style={
            done
              ? { background: "var(--hue-fern-tint)", color: "var(--hue-fern-key)" }
              : { background: "var(--color-sunken)", color: "var(--color-fg-subtle)" }
          }
        >
          {icon}
        </span>
        {last ? null : <span className="my-1 w-px flex-1 bg-line" />}
      </span>

      <div className={`flex min-w-0 flex-1 flex-col gap-2.5 ${last ? "pb-1" : "pb-7"}`}>
        <span className="text-[13px] font-medium text-fg-subtle">{title}</span>
        {children}
      </div>
    </li>
  );
}

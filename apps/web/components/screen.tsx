import * as React from "react";
import { BackLink } from "./back-link";

/**
 * R24.6, R24.11. A screen's own column, inside the frame its layout draws.
 *
 * The frame is a layout now, so the sidebar, the top bar and the bell are kept
 * across a navigation and only this column is fetched. What a screen used to
 * hand `AppShell` lives here instead: its one action, the way back out of a
 * record, and how wide it gets.
 *
 * The name across the top is the frame's, read from the address, and a screen
 * does not pass it one. What a screen passes here is its own name where the
 * address cannot give it: a service, a campaign, a kind of group, the labels
 * under check-in. That is drawn at the size a heading inside a screen takes,
 * under the bar rather than instead of it.
 *
 * The width caps the reading column rather than the frame: `main` keeps the
 * gutter, so a wide screen reaches the edge and a narrow one stops where the
 * design says it stops.
 */
export function Screen({
  title,
  action,
  back,
  wide,
  max,
  children,
}: {
  /**
   * This screen's own name, where the bar's is the area's. A record, or a
   * screen under an entry: the service, the campaign, the label layout.
   */
  title?: string;
  /** The one filled button for this screen. Some screens have none. */
  action?: React.ReactNode;
  /** The way back out of a record, above its name. */
  back?: { href: string; label: string };
  /** A table-shaped screen that wants the room. */
  wide?: boolean;
  /** How wide the column gets before it stops growing. */
  max?: string;
  children: React.ReactNode;
}) {
  return (
    /* Every screen in the design is a column with 28px between its blocks. */
    <div
      className={
        "flex w-full min-w-0 flex-col gap-7 "
        + (wide ? "" : max ?? "max-w-[1280px]")
      }
    >
      {back || action ? (
        /* R24.6. The way out of a record and the screen's one action share a
           row, which is where they were before the frame became a layout. */
        <div className="flex flex-wrap items-center justify-between gap-3">
          {back ? <BackLink href={back.href} label={back.label} /> : <span />}
          {action}
        </div>
      ) : null}

      {title ? (
        <h2 className="-mb-2 font-display text-[22px] font-normal leading-[28px] text-fg">
          {title}
        </h2>
      ) : null}

      {children}
    </div>
  );
}

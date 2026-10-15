import * as React from "react";
import { BackLink } from "./back-link";
import { PageHeader, type Crumb } from "./page-header";

/**
 * R24.6, R24.11. A screen's own column, inside the frame its layout draws.
 *
 * The frame is a layout now, so the sidebar, the top bar and the bell are kept
 * across a navigation and only this column is fetched. What a screen used to
 * hand `AppShell` (its name, its one action, the way back out of a record, how
 * wide it gets) belongs to the screen and lives here, which is also where the
 * design pass put the page header.
 *
 * The width caps the reading column rather than the frame: `main` keeps the
 * gutter, so a wide screen reaches the edge and a narrow one stops where the
 * design says it stops.
 */
export function Screen({
  title,
  trail,
  lede,
  action,
  back,
  wide,
  max,
  children,
}: {
  /** The screen's name, where the screen does not already carry one. */
  title?: string;
  /** The screens above this one. One entry draws no trail. */
  trail?: Crumb[];
  /** What the screen is for, in a line. The one place a lede is allowed. */
  lede?: string;
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
      {back || title || action ? (
        /* The way back rides above the name rather than a row of its own, so
           the top of a record is one block. */
        <div className="flex flex-col gap-3">
          {back ? <BackLink href={back.href} label={back.label} /> : null}

          {title ? (
            <PageHeader trail={trail} title={title} lede={lede} action={action} />
          ) : action ? (
            <div className="flex flex-wrap items-center justify-end gap-3">{action}</div>
          ) : null}
        </div>
      ) : null}

      {children}
    </div>
  );
}

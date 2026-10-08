import * as React from "react";

/**
 * R18.x. One number across the top of a report.
 *
 * The same shape as the dashboard's tiles, without the handle: a report is
 * read rather than arranged. A hue dot keys it to whatever it stands for in
 * the charts underneath.
 */
export function Figure({
  label,
  value,
  sub,
  hue,
  icon,
  note,
}: {
  label: string;
  value: string;
  sub: string;
  hue: string;
  /**
   * A mark in the hue, where the tile is one of a row that stands for
   * different kinds of thing rather than slices of one chart. The dot is
   * enough when they are all the same kind.
   */
  icon?: React.ReactNode;
  /** One more fact under the figure, where there is one worth the line. */
  note?: string;
}) {
  return (
    <div className="flex flex-col rounded-[14px] border border-line bg-surface p-5 shadow-sm">
      <span className="flex items-center gap-2 text-[13px] font-medium text-fg-muted">
        {icon ? (
          <span
            aria-hidden
            className="grid size-7 shrink-0 place-items-center rounded-lg [&_svg]:size-4"
            style={{
              background: `var(--hue-${hue}-100)`,
              color: `var(--hue-${hue}-700)`,
            }}
          >
            {icon}
          </span>
        ) : (
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full"
            style={{ background: `var(--hue-${hue}-500)` }}
          />
        )}
        <span className="truncate">{label}</span>
      </span>
      <p data-numeric className="mt-3 font-display text-[36px] leading-[42px] text-fg">
        {value}
      </p>
      <p className="mt-1 text-[13px] text-fg-muted">{sub}</p>
      {note ? (
        <p data-numeric className="mt-1 text-[13px] text-warning-text">{note}</p>
      ) : null}
    </div>
  );
}

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
}: {
  label: string;
  value: string;
  sub: string;
  hue: string;
}) {
  return (
    <div className="flex flex-col rounded-[14px] border border-line bg-surface p-5 shadow-sm">
      <span className="flex items-center gap-2 text-[13px] font-medium text-fg-muted">
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full"
          style={{ background: `var(--hue-${hue}-500)` }}
        />
        <span className="truncate">{label}</span>
      </span>
      <p data-numeric className="mt-3 font-display text-[40px] leading-[44px] text-fg">
        {value}
      </p>
      <p className="mt-1 text-[13px] text-fg-muted">{sub}</p>
    </div>
  );
}

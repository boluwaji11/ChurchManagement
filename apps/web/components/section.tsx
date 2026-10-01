import * as React from "react";

export function PageTitle({
  title,
  lede,
  className = "mb-10",
}: {
  title: string;
  /** Only where the page needs saying. The church's name is in the header. */
  lede?: string;
  className?: string;
}) {
  return (
    <div className={`flex max-w-2xl flex-col gap-2 ${className}`}>
      <h1 className="font-display text-display text-fg">{title}</h1>
      {lede ? <p className="text-body-lg text-fg-muted">{lede}</p> : null}
    </div>
  );
}

export function Section({
  title,
  note,
  action,
  children,
}: {
  title: string;
  note?: string;
  /** A single control that belongs to this section, right-aligned against its heading. */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-12 flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex max-w-2xl flex-col gap-1">
          <h2 className="font-display text-heading text-fg">{title}</h2>
          {note ? <p className="text-[length:var(--d-text-body)] text-fg-muted">{note}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

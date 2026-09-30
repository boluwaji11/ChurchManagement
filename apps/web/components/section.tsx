import * as React from "react";

export function PageTitle({ title, lede }: { title: string; lede: string }) {
  return (
    <div className="mb-10 flex max-w-2xl flex-col gap-2">
      <h1 className="font-display text-display text-fg">{title}</h1>
      <p className="text-body-lg text-fg-muted">{lede}</p>
    </div>
  );
}

export function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-12 flex flex-col gap-4">
      <div className="flex max-w-2xl flex-col gap-1">
        <h2 className="font-display text-heading text-fg">{title}</h2>
        {note ? <p className="text-[length:var(--d-text-body)] text-fg-muted">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

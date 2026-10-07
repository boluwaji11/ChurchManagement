import * as React from "react";

/**
 * R17.1. The pieces a portal screen is built from.
 *
 * Kept apart from the shell because the shell reads the database and the
 * client components on these screens need the card: importing one would drag
 * `server-only` into the browser bundle.
 */

/** The screen's own name, at the size the design gives it. */
export function PortalTitle({ title, under }: { title: string; under?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-display text-[36px] font-normal leading-[42px] text-fg">{title}</h1>
      {/* A div rather than a paragraph: the line under a title is sometimes a
          church's own description, which carries its own paragraphs. */}
      {under ? (
        <div className="text-[length:var(--d-text-body)] text-fg-muted">{under}</div>
      ) : null}
    </div>
  );
}

/** A block within a screen, under a heading at the design's own size. */
export function PortalSection({
  title,
  aside,
  children,
}: {
  title?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-4">
      {title || aside ? (
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          {title ? (
            <h2 className="font-display text-[22px] font-normal leading-7 text-fg">{title}</h2>
          ) : <span />}
          {aside}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** The design's card: a 16px radius, a hairline, and 20px inside. */
export function Panel({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-5 ${className}`}>
      {children}
    </section>
  );
}

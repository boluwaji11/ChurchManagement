import Link from "next/link";
import { PageHeader, type Crumb } from "@connectapp/ui";

/**
 * HRT-393, R24.15. The head of a portal screen, and the column it sits in.
 *
 * Every screen in here wore its own hand-drawn header: an `h1` at 26px, a
 * hairline under it, and a different measurement each time. `PageHeader` is
 * the product's own, it carries the trail a screen four levels down needs, and
 * using it means the portal moves whenever the design system does.
 */
export function Screen({
  trail,
  title,
  lede,
  action,
  children,
}: {
  trail?: Crumb[];
  title: string;
  lede?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6">
      <PageHeader trail={trail} title={title} lede={lede} action={action} linkAs={Link} />
      {children}
    </div>
  );
}

/**
 * A block of a screen, with its own heading.
 *
 * Written once because eight screens each drew the same `h2` at a slightly
 * different size.
 */
export function Block({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 font-display text-heading text-fg">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** A plain surface to put a block's content on. */
export function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-line bg-surface p-[var(--d-pad-card)] ${className ?? ""}`}>
      {children}
    </div>
  );
}

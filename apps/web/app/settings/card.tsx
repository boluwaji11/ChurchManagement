import * as React from "react";

/**
 * R24.6. The shape a settings screen is built from.
 *
 * Every one of these screens is the same thing: a few related facts, a mark
 * that says which kind they are, and one action. Written once here so they
 * read as one product rather than as a dozen screens that each invented a
 * card.
 */
export function SettingCard({
  icon,
  title,
  lede,
  action,
  children,
  className,
}: {
  /** The mark at the head of the card, in the product's own colour. */
  icon?: React.ReactNode;
  title: string;
  /** What this card is for, where the title does not say it. */
  lede?: string;
  /** The card's one action, which rides the title's line. */
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex flex-col gap-4 rounded-[14px] border border-line bg-surface p-5 shadow-sm ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        {icon ? (
          <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-primary-soft text-primary [&_svg]:size-[18px]">
            {icon}
          </span>
        ) : null}

        <span className="flex min-w-0 flex-1 flex-col leading-5">
          <span className="text-[15px] font-bold text-fg">{title}</span>
          {lede ? <span className="truncate text-[13px] text-fg-muted">{lede}</span> : null}
        </span>

        {action}
      </div>

      {children ? (
        <>
          <hr className="border-0 border-t border-line" />
          {children}
        </>
      ) : null}
    </section>
  );
}

/** The facts a card holds, laid out across whatever room the screen has. */
export function Details({ children }: { children: React.ReactNode }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
      {children}
    </dl>
  );
}

/** One of them: what it is called, and what it says. */
export function Detail({
  label,
  children,
}: {
  label: string;
  children?: React.ReactNode;
}) {
  const empty =
    children === null
      || children === undefined
      || (typeof children === "string" && children.trim() === "");

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-[12px] font-medium tracking-[0.02em] text-fg-subtle uppercase">
        {label}
      </dt>
      <dd className="truncate text-[length:var(--d-text-body)] text-fg">
        {empty ? (
          <span aria-hidden className="inline-block h-px w-3 bg-line-strong align-middle" />
        ) : (
          children
        )}
      </dd>
    </div>
  );
}

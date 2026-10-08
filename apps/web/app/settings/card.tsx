import * as React from "react";
import { ChevronDown } from "lucide-react";

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
  onPress,
  expanded,
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
  /**
   * R24.x. Makes the whole head of the card the thing you press.
   *
   * A card whose only action is "open me" does not need a button saying so
   * on the end of its own title. The head opens it and a chevron says which
   * way it is about to go.
   */
  onPress?: () => void;
  expanded?: boolean;
  children?: React.ReactNode;
  className?: string;
}) {
  const head = (
    <>
      {icon ? (
        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-primary-soft text-primary [&_svg]:size-[18px]">
          {icon}
        </span>
      ) : null}

      <span className="flex min-w-0 flex-1 flex-col text-left leading-5">
        <span className="text-[15px] font-bold text-fg">{title}</span>
        {lede ? <span className="truncate text-[13px] text-fg-muted">{lede}</span> : null}
      </span>

      {action}

      {onPress ? (
        <ChevronDown
          aria-hidden
          className={`size-[18px] shrink-0 text-fg-muted transition-transform duration-instant ${
            expanded ? "rotate-180" : ""
          }`}
        />
      ) : null}
    </>
  );

  return (
    <section
      className={`flex flex-col gap-4 rounded-[14px] border border-line bg-surface p-5 shadow-sm ${className ?? ""}`}
    >
      {onPress ? (
        <button
          type="button"
          onClick={onPress}
          aria-expanded={expanded}
          className="-m-1 flex cursor-pointer flex-wrap items-center gap-3 rounded-[10px] p-1 text-left hover:bg-sunken"
        >
          {head}
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-3">{head}</div>
      )}

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
    <dl className="grid gap-x-6 gap-y-4 [grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr))]">
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

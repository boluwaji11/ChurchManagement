import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@connectapp/ui";

/**
 * The parts the ConnectApp website is built from.
 *
 * The site runs at marketing scale rather than office density: display type at
 * 400 weight, 48px calls to action, sections 104px deep. Every number here is
 * the one in the design, set once so the page itself reads as a list of
 * sections.
 */

/** The 48px call to action. */
export const SITE_CTA =
  "min-h-12 gap-2 rounded-xl px-[22px] text-[16px] font-semibold shadow-none active:scale-100";

/** The same action at the 38px the sticky bar carries. */
export const SITE_BAR_CTA =
  "min-h-[38px] gap-1.5 rounded-[10px] px-4 text-[14px] font-semibold shadow-none active:scale-100";

/** The outlined one beside it: a 1px line, no fill of its own. */
export const SITE_CTA_QUIET =
  "min-h-12 gap-2 rounded-xl px-[22px] text-[16px] font-medium border-line shadow-none active:scale-100 hover:bg-surface hover:border-line-strong";

/** The coloured line above a section heading. */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="text-[14px] font-semibold text-primary">{children}</span>;
}

/** A section heading. Display serif at 400, which is how the design sets it. */
export function SectionTitle({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h2
      className={cn(
        "m-0 text-balance font-display text-[clamp(2rem,4vw,2.75rem)] font-normal leading-[1.1] text-fg",
        className,
      )}
    >
      {children}
    </h2>
  );
}

/** The ticks beside a feature section. */
export function Ticks({ items }: { items: readonly string[] }) {
  return (
    <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-x-6 gap-y-3 p-0">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5 text-[16px] leading-6 text-fg">
          <Check className="mt-0.5 size-5 shrink-0 text-success-text" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** One card in the feature grid, and in the trust row below it. */
export function Tile({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="group flex flex-col gap-1.5 rounded-2xl border border-line bg-canvas p-6 transition-[border-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_10px_28px_oklch(0.3_0.04_75/0.10)]">
      <span className="mb-2.5 grid size-10 place-items-center rounded-[10px] bg-primary-soft text-primary transition-colors duration-200 group-hover:bg-primary group-hover:text-primary-fg [&_svg]:size-5">
        {icon}
      </span>
      <span className="text-[17px] font-semibold text-fg">{title}</span>
      <span className="text-[15px] leading-[22px] text-fg-muted">{body}</span>
    </div>
  );
}

const LIFT =
  "shadow-[0_2px_4px_oklch(0_0_0/0.04),0_20px_48px_oklch(0.3_0.04_75/0.12)]";

/**
 * A screen of the product, in a window.
 *
 * The three dots are a window, not a browser: what is inside is the product, so
 * the chrome around it says "this is a screen" and then gets out of the way.
 */
export function BrowserFrame({ children }: { children?: React.ReactNode }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-stone-300 bg-surface", LIFT)}>
      <div className="flex h-[34px] items-center gap-[7px] border-b border-line bg-sunken px-3.5">
        <span className="size-2.5 rounded-full bg-stone-300" />
        <span className="size-2.5 rounded-full bg-stone-300" />
        <span className="size-2.5 rounded-full bg-stone-300" />
      </div>
      <div className="relative aspect-[1440/900] w-full overflow-hidden bg-sunken">{children}</div>
    </div>
  );
}

/** The member app, in a phone. */
export function PhoneFrame({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex justify-center rounded-[20px] bg-sunken py-8">
      <div className="w-[min(300px,80%)] overflow-hidden rounded-[36px] border-8 border-stone-900 bg-canvas">
        <div className="relative aspect-[390/844] w-full overflow-hidden bg-sunken">{children}</div>
      </div>
    </div>
  );
}

/**
 * A screen of the product, filling its frame.
 *
 * The files under public/marketing are captures of the real thing, taken at
 * twice the size so they stay sharp, and they are retaken whenever the screen
 * they show changes.
 */
export function Shot({ src }: { src: string }) {
  return <img src={src} alt="" className="size-full object-cover object-top" />;
}

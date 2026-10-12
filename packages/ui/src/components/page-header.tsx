import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "../lib/cn";

export interface Crumb {
  label: string;
  /** Left out for the step a reader is already on, which is never a link. */
  href?: string;
}

/**
 * R24.6, R24.15. The head of a screen: where you are, what this is, what it is
 * for, and the one thing to do with it.
 *
 * Written once because there were three ways of doing it. `TopBar` drew an h1
 * in the chrome, `PageTitle` drew another on the page, and a screen that used
 * both put two h1 elements on one document; a third set of screens named
 * themselves inside their own content. Nothing carried a trail, so a member
 * record four levels down said only the person's name, and the way back was
 * the browser button.
 *
 * The trail is above the title rather than beside it, so the title stays the
 * loudest thing on the screen. On a phone it scrolls sideways instead of
 * wrapping: three lines of breadcrumb above a title is a header taller than
 * the content under it.
 *
 * One action, on the title's row. A row of six filled buttons tells a
 * volunteer nothing about which to press.
 */
export function PageHeader({
  trail,
  title,
  lede,
  action,
  linkAs,
  className,
}: {
  /** The screens above this one. One entry means no trail is drawn. */
  trail?: Crumb[];
  title: string;
  /**
   * What the screen is for, in a line.
   *
   * The one place a lede is allowed. CLAUDE.md bans explanatory copy under a
   * heading everywhere else, and that still holds: this is the screen saying
   * what it is, not a sentence reassuring somebody about a field.
   */
  lede?: string;
  /** The screen's single action, right aligned on the title's row. */
  action?: React.ReactNode;
  /**
   * What draws a link in the trail. A plain anchor by default, so this package
   * stays free of any router; an app passes its own so the trail navigates
   * without reloading the document.
   */
  linkAs?: React.ElementType;
  className?: string;
}) {
  const Link = linkAs ?? "a";
  /* A trail of one is the screen naming itself twice. */
  const steps = trail && trail.length > 1 ? trail : null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {steps ? (
        <nav aria-label={title}>
          <ol
            className={cn(
              "m-0 flex list-none items-center gap-1 p-0",
              // Sideways on a phone, and the bar itself is never drawn: a
              // scrollbar above a title reads as a second piece of chrome.
              // Written out rather than borrowed from the app's own utility,
              // because this package is used by the admin app too.
              "overflow-x-auto whitespace-nowrap",
              "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              "text-label text-fg-muted",
            )}
          >
            {steps.map((step, i) => {
              const last = i === steps.length - 1;
              return (
                <li key={`${step.label}-${i}`} className="flex shrink-0 items-center gap-1">
                  {i > 0 ? (
                    <ChevronRight className="size-3.5 shrink-0 text-fg-subtle" aria-hidden />
                  ) : null}
                  {step.href && !last ? (
                    <Link
                      href={step.href}
                      className={cn(
                        "rounded-sm no-underline",
                        "transition-colors duration-instant hover:text-fg",
                      )}
                    >
                      {step.label}
                    </Link>
                  ) : (
                    /* The step underfoot. Marked for a screen reader so the
                       trail says which of its entries is this screen. */
                    <span aria-current={last ? "page" : undefined}>{step.label}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 max-w-2xl flex-col gap-1.5">
          <h1 className="m-0 text-balance font-display text-display text-fg">{title}</h1>
          {lede ? <p className="m-0 text-body-lg text-fg-muted">{lede}</p> : null}
        </div>
        {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
      </div>
    </div>
  );
}

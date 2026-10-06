"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Check, X } from "lucide-react";
import { Button, IconButton, cn } from "@connectapp/ui";
import { t } from "@connectapp/i18n";

export interface DockStep {
  step: string;
  done: boolean;
  skipped: boolean;
  href: string;
}

/**
 * R22.1. The setup path, following somebody around while they are on it.
 *
 * Each step of setting up a church happens on the screen that really does that
 * job, which is the right place for it and the wrong place to lose the thread:
 * press Do it and the setup page is gone, with nothing to say what happens
 * after this. So the path comes along. It sits out of the way in the corner,
 * says how far through somebody is, and carries the next step so they never
 * have to find their way back.
 *
 * Closing it closes it for this visit rather than for good. Skipping the whole
 * thing is a decision with a confirm behind it, on the setup page, and a corner
 * of a screen is not where somebody should make it by accident.
 */
export function SetupDock({
  church,
  steps,
  done,
}: {
  church: string;
  steps: DockStep[];
  /** How many are settled, so the dock agrees with the setup page. */
  done: number;
}) {
  const path = usePathname();
  const key = `connectapp-setup-dock:${church}`;
  const [shut, setShut] = React.useState(true);

  // Read after hydration, so the server and the client render the same thing.
  React.useEffect(() => {
    try {
      setShut(sessionStorage.getItem(key) === "1");
    } catch {
      setShut(false);
    }
  }, [key]);

  const close = () => {
    setShut(true);
    try {
      sessionStorage.setItem(key, "1");
    } catch {
      /* A browser with storage switched off still closes it for this render. */
    }
  };

  /*
   * The setup page is the path itself, and the dashboard carries the same steps
   * across the top of it. On both, a second copy in the corner is noise.
   */
  if (path === "/setup" || path === "/dashboard" || shut) return null;

  const next = steps.find((step) => !step.done && !step.skipped);
  if (!next) return null;

  return (
    <aside
      aria-label={t("setup.dock.title")}
      className={cn(
        "fixed right-4 z-40 w-[310px] max-w-[calc(100vw-2rem)]",
        "bottom-20 sm:bottom-6",
        "flex flex-col gap-3 rounded-2xl border border-line p-4",
        // Translucent, so it reads as something laid over the screen rather
        // than a hole cut in it, and the page keeps showing through.
        "bg-[color-mix(in_oklch,var(--surface)_86%,transparent)] backdrop-blur-[12px]",
        "shadow-[0_8px_28px_oklch(0.3_0.04_75/0.16)]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex flex-col">
          <span className="text-[14px] font-semibold text-fg">{t("setup.dock.title")}</span>
          <span className="text-[length:var(--d-text-caption)] text-fg-muted">
            {t("setup.dock.count", { done: String(done), all: String(steps.length) })}
          </span>
        </span>
        <IconButton label={t("setup.dock.close")} variant="ghost" onClick={close}>
          <X />
        </IconButton>
      </div>

      {/* The same path the setup page draws, at the size a corner allows: a
          marker each with the line running between them. Every step is its own
          press, in any order, because a church that wants to invite its team
          before it imports anybody should not have to argue with us. */}
      <ol className="m-0 flex list-none flex-col p-0">
        {steps.map((step, i) => {
          const here = next.step === step.step;
          const last = i === steps.length - 1;
          return (
            <li key={step.step} className="relative flex">
              {last ? null : (
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-[9.5px] top-[26px] bottom-0 w-px",
                    step.done ? "bg-primary" : "bg-line-strong",
                  )}
                />
              )}

              <Link
                href={`${step.href}?church=${church}&setup=1`}
                className={cn(
                  "relative z-10 mb-1 flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1 py-1",
                  "text-[13px] no-underline transition-colors duration-instant hover:bg-sunken",
                  here ? "font-semibold text-fg" : step.done ? "text-fg-subtle" : "text-fg-muted",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold",
                    step.done || here
                      ? "bg-primary text-primary-fg"
                      : "border border-line-strong bg-surface text-fg-subtle",
                  )}
                >
                  {step.done ? <Check className="size-3" /> : i + 1}
                </span>
                <span className="min-w-0 truncate">
                  {t(`setup.short.${step.step}` as never)}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/setup?church=${church}`}
          className="text-[13px] font-medium text-primary underline underline-offset-4"
        >
          {t("setup.dock.all")}
        </Link>
        <Button asChild className="min-h-8 rounded-lg px-3 text-[13px]">
          <Link href={`${next.href}?church=${church}&setup=1`}>
            {t("setup.do")} <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>
    </aside>
  );
}

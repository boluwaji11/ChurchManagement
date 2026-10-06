"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Check, X } from "lucide-react";
import {
  Button, Dialog, DialogContent, DialogClose, DialogFooter, IconButton, cn,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { putAway } from "@/app/setup/actions";

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
 * Closing it asks which kind of closing is meant. For this visit is the common
 * one and the easy one. For good is the same decision as skipping the whole of
 * setup, so it is said in those words rather than hidden behind an x.
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

  const [asking, setAsking] = React.useState(false);
  const [, startTransition] = React.useTransition();

  const hideForNow = () => {
    setAsking(false);
    setShut(true);
    try {
      sessionStorage.setItem(key, "1");
    } catch {
      /* A browser with storage switched off still closes it for this render. */
    }
  };

  const hideForGood = () => {
    setAsking(false);
    setShut(true);
    startTransition(async () => {
      await putAway(church);
    });
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
        // than a hole cut in it, and the page keeps showing through. The wash
        // over it is the one the public pages carry, at the size of a panel.
        "bg-[color-mix(in_oklch,var(--surface)_84%,transparent)] backdrop-blur-[12px]",
        "bg-[image:radial-gradient(22rem_14rem_at_0%_0%,color-mix(in_oklch,var(--primary)_20%,transparent),transparent_70%)]",
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
        <IconButton label={t("setup.dock.close")} variant="ghost" onClick={() => setAsking(true)}>
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
            <li key={step.step} className={cn("flex gap-2.5", last ? "pb-0" : "pb-3")}>
              {/* The marker column stretches the whole row, so the line runs
                  from under one marker to the top of the next whatever the row
                  turns out to be, with a dot sitting on it. */}
              <span className="flex w-5 shrink-0 flex-col items-center" aria-hidden>
                <span
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold",
                    step.done || here
                      ? "bg-primary text-primary-fg"
                      : "border border-line-strong bg-surface text-fg-subtle",
                  )}
                >
                  {step.done ? <Check className="size-3" /> : i + 1}
                </span>
                {last ? null : (
                  <span
                    className={cn(
                      "relative mt-1 w-px flex-1",
                      step.done ? "bg-primary" : "bg-line-strong",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute left-1/2 top-1/2 size-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full",
                        step.done ? "bg-primary" : "bg-line-strong",
                      )}
                    />
                  </span>
                )}
              </span>

              <Link
                href={`${step.href}?church=${church}&setup=1`}
                className={cn(
                  "-mt-0.5 min-w-0 flex-1 truncate rounded-lg px-1.5 py-1 no-underline",
                  "text-[13px] transition-colors duration-instant hover:bg-sunken",
                  here ? "font-semibold text-fg" : step.done ? "text-fg-subtle" : "text-fg-muted",
                )}
              >
                {t(`setup.short.${step.step}` as never)}
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

      <Dialog open={asking} onOpenChange={setAsking}>
        <DialogContent title={t("setup.dock.hide.title")}>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" data-dismiss onClick={hideForGood}>
                {t("setup.dock.hide.ever")}
              </Button>
            </DialogClose>
            <Button onClick={hideForNow}>{t("setup.dock.hide.now")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

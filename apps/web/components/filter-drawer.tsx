"use client";

import * as React from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button, IconButton, Tooltip, cn } from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/**
 * R24.6. Narrowing a long list, in the panel the whole product uses for it.
 *
 * The directory wrote this once and the giving screen wanted the same thing,
 * so it lives here: a button that says how much is narrowing, a panel from
 * the side, and a foot that clears everything or puts the panel away.
 *
 * What goes inside is the screen's own business. Each one knows what its
 * list can be narrowed by, and none of them should have to agree on a shape
 * for a question.
 */
export function FilterDrawer({
  title,
  narrowing,
  onClear,
  onOpen,
  onApply,
  busy = false,
  done,
  compact = false,
  children,
}: {
  title: string;
  /** How many filters are on, which the button carries. */
  narrowing: number;
  onClear: () => void;
  /**
   * R24.6. Given by a screen that holds its answers until Show is pressed.
   *
   * `onOpen` is the moment to seed the draft from what is actually in force,
   * so the panel never opens on something somebody half chose last time and
   * walked away from. `onApply` is the press.
   */
  onOpen?: () => void;
  onApply?: () => void;
  /**
   * R24.6. Whether the list behind the panel is still being fetched.
   *
   * Narrowing a directory of two hundred people is a round trip, and a
   * button that looks untouched for a second reads as a button that did not
   * work. The panel stays open with its controls dead until the rows land,
   * then puts itself away.
   */
  busy?: boolean;
  /** What the foot's own button says, usually how much is left. */
  done: string;
  /**
   * R24.6. Drawn as a mark rather than a worded button.
   *
   * For a row that already carries several marks: one worded control among
   * them reads as the only thing there, and the words are in the tooltip and
   * in its name either way.
   */
  compact?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  /* Pressed, and waiting on the rows. The panel closes when they arrive. */
  const [leaving, setLeaving] = React.useState(false);

  React.useEffect(() => {
    if (leaving && !busy) {
      setLeaving(false);
      setOpen(false);
    }
  }, [leaving, busy]);

  const show = (next: boolean) => {
    if (next) onOpen?.();
    setLeaving(false);
    setOpen(next);
  };

  return (
    <>
      {compact ? (
        <Tooltip content={t("directory.filter")}>
          <button
            type="button"
            onClick={() => show(true)}
            aria-expanded={open}
            aria-label={
              narrowing > 0
                ? t("directory.filterOn", { count: narrowing })
                : t("directory.filter")
            }
            className={cn(
              "relative grid size-[34px] cursor-pointer place-items-center rounded-md",
              "[&_svg]:size-[18px]",
              narrowing > 0
                ? "bg-primary-soft text-primary"
                : "text-fg-muted hover:bg-sunken hover:text-fg",
            )}
          >
            <SlidersHorizontal />
            {narrowing > 0 ? (
              <span
                aria-hidden
                className="absolute -top-0.5 -right-0.5 grid h-[16px] min-w-[16px] place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-fg tabular-nums"
              >
                {narrowing}
              </span>
            ) : null}
          </button>
        </Tooltip>
      ) : (
        <button
          type="button"
          onClick={() => show(true)}
          aria-expanded={open}
          className={cn(
            "flex h-[34px] cursor-pointer items-center gap-1.5 rounded-md border px-3",
            "text-[13px] font-medium [&_svg]:size-4",
            narrowing > 0
              ? "border-primary bg-primary-soft text-primary"
              : "border-line-strong bg-surface text-fg hover:bg-sunken",
          )}
        >
          <SlidersHorizontal />
          {narrowing > 0 ? t("directory.filterOn", { count: narrowing }) : t("directory.filter")}
        </button>
      )}

      {open ? (
        <div
          className="fixed inset-0 z-40 flex justify-end bg-overlay"
          onClick={() => show(false)}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-[min(380px,100%)] flex-col bg-canvas shadow-[-8px_0_24px_oklch(0_0_0/0.12)]"
          >
            <div className="flex items-center gap-3 border-b border-line px-4 py-[18px] sm:px-6">
              <span className="min-w-0 flex-1 truncate font-display text-[22px] text-fg">{title}</span>
              <IconButton label={t("common.close")} onClick={() => show(false)}>
                <X />
              </IconButton>
            </div>

            <div
              aria-busy={busy}
              className={cn(
                "flex flex-1 flex-col gap-6 overflow-auto px-4 py-5 sm:px-6",
                busy && "pointer-events-none opacity-60",
              )}
            >
              {children}
            </div>

            {/* R24.6. The panel runs to the glass on a phone, so the foot
                clears the inset the home indicator sits in, and the pair
                wraps rather than squashing one of them to half its words. */}
            <div
              className={cn(
                "flex flex-wrap items-center gap-3 border-t border-line px-4 py-4 sm:px-6",
                "pb-[calc(1rem+env(safe-area-inset-bottom))]",
              )}
            >
              <Button variant="secondary" disabled={busy} onClick={onClear}>
                {t("directory.clear")}
              </Button>
              <Button
                className="min-w-0 flex-1"
                loading={busy}
                onClick={() => {
                  onApply?.();
                  setLeaving(true);
                }}
              >
                {done}
              </Button>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

/** One question inside the panel, and the answers to it. */
export function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-[13px] font-semibold text-fg">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

/**
 * A 34px pill. Two kinds, as the design has them.
 *
 * One of a set is filled in ink and reads white, because it is answering
 * "which of these". Something switched on takes the accent and a heavier
 * edge and leaves the rest alone.
 */
export function ChipButton({
  on,
  onClick,
  tone = "accent",
  children,
}: {
  on: boolean;
  onClick: () => void;
  tone?: "ink" | "accent";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "flex h-[34px] cursor-pointer items-center gap-2 rounded-full px-3.5 text-[13px] font-medium",
        !on && "border border-line-strong bg-surface text-fg hover:bg-sunken",
        on && tone === "ink" && "border border-fg bg-fg text-canvas",
        on && tone === "accent" && "border-[1.5px] border-primary bg-primary-soft text-primary",
      )}
    >
      {children}
    </button>
  );
}

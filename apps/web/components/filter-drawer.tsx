"use client";

import * as React from "react";
import { ArrowDownUp, SlidersHorizontal, X } from "lucide-react";
import { Button, IconButton, RadioGroup, RadioItem, Tooltip, cn } from "@connectapp/ui";
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
              "relative grid size-[var(--d-tap)] cursor-pointer place-items-center rounded-md",
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
        <SidePanel
          title={title}
          busy={busy}
          onClose={() => show(false)}
          footer={
            <>
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
            </>
          }
        >
          {children}
        </SidePanel>
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

/**
 * R24.6. The panel every one of these opens from the right.
 *
 * Written once: a sheet that narrows a list and a sheet that reorders one are
 * the same piece of furniture with different questions in it.
 */
function SidePanel({
  title,
  busy,
  onClose,
  footer,
  children,
}: {
  title: string;
  busy: boolean;
  onClose: () => void;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-overlay" onClick={onClose}>
      <aside
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-[min(380px,100%)] flex-col bg-canvas shadow-[-8px_0_24px_oklch(0_0_0/0.12)]"
      >
        <div className="flex items-center gap-3 border-b border-line px-4 py-[18px] sm:px-6">
          <span className="min-w-0 flex-1 truncate font-display text-[22px] text-fg">{title}</span>
          <IconButton label={t("common.close")} onClick={onClose}>
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

        {/* R24.6. The panel runs to the glass on a phone, so the foot clears
            the inset the home indicator sits in, and the pair wraps rather
            than squashing one of them to half its words. */}
        <div
          className={cn(
            "flex flex-wrap items-center gap-3 border-t border-line px-4 py-4 sm:px-6",
            "pb-[calc(1rem+env(safe-area-inset-bottom))]",
          )}
        >
          {footer}
        </div>
      </aside>
    </div>
  );
}

/**
 * R2.14, R24.6. Putting the list in a different order.
 *
 * The same panel the filter opens, asking the other question a long list
 * raises. A mark rather than a worded control, because it sits in a row of
 * marks, and it carries the product's own colour while the order is anything
 * other than the one the directory keeps by default.
 */
export function SortDrawer({
  value,
  dir,
  options,
  busy = false,
  onApply,
}: {
  /** Which field the list is in the order of. */
  value: string;
  dir: "asc" | "desc";
  /** What a church may sort by, in the order they are offered. */
  options: { value: string; label: string; rising: string; falling: string }[];
  busy?: boolean;
  onApply: (next: { sort: string; dir: "asc" | "desc" }) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [field, setField] = React.useState(value);
  const [way, setWay] = React.useState(dir);
  const [leaving, setLeaving] = React.useState(false);

  React.useEffect(() => {
    if (leaving && !busy) {
      setLeaving(false);
      setOpen(false);
    }
  }, [leaving, busy]);

  const show = (next: boolean) => {
    if (next) { setField(value); setWay(dir); }
    setLeaving(false);
    setOpen(next);
  };

  const chosen = options.find((one) => one.value === field) ?? options[0]!;
  /* The order a directory keeps unless somebody says otherwise. */
  const ordinary = value === options[0]?.value && dir === "asc";

  return (
    <>
      <Tooltip content={t("directory.sort")}>
        <button
          type="button"
          onClick={() => show(true)}
          aria-expanded={open}
          aria-label={t("directory.sort")}
          className={cn(
            "grid size-[var(--d-tap)] cursor-pointer place-items-center rounded-md [&_svg]:size-[18px]",
            ordinary
              ? "text-fg-muted hover:bg-sunken hover:text-fg"
              : "bg-primary-soft text-primary",
          )}
        >
          <ArrowDownUp />
        </button>
      </Tooltip>

      {open ? (
        <SidePanel
          title={t("directory.sort")}
          busy={busy}
          onClose={() => show(false)}
          footer={
            <Button
              className="min-w-0 flex-1"
              loading={busy}
              onClick={() => {
                onApply({ sort: field, dir: way });
                setLeaving(true);
              }}
            >
              {t("directory.sort.apply")}
            </Button>
          }
        >
          <div className="flex flex-col gap-1.5">
            <span className="text-label text-fg">{t("directory.sort.by")}</span>
            <RadioGroup value={field} onValueChange={setField}>
              {options.map((one) => (
                <RadioItem key={one.value} value={one.value}>{one.label}</RadioItem>
              ))}
            </RadioGroup>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-label text-fg">{t("directory.sort.order")}</span>
            {/* The words follow the field: oldest and newest for a date, A and
                Z for a name. "Ascending" is nobody's word for either. */}
            <RadioGroup value={way} onValueChange={(next) => setWay(next as "asc" | "desc")}>
              <RadioItem value="asc">{chosen.rising}</RadioItem>
              <RadioItem value="desc">{chosen.falling}</RadioItem>
            </RadioGroup>
          </div>
        </SidePanel>
      ) : null}
    </>
  );
}

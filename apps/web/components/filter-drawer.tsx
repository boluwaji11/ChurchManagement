"use client";

import * as React from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button, IconButton, cn } from "@connectapp/ui";
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
  done,
  children,
}: {
  title: string;
  /** How many filters are on, which the button carries. */
  narrowing: number;
  onClear: () => void;
  /** What the foot's own button says, usually how much is left. */
  done: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
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

      {open ? (
        <div
          className="fixed inset-0 z-40 flex justify-end bg-overlay"
          onClick={() => setOpen(false)}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-[min(380px,100%)] flex-col bg-canvas shadow-[-8px_0_24px_oklch(0_0_0/0.12)]"
          >
            <div className="flex items-center gap-3 border-b border-line px-6 py-[18px]">
              <span className="flex-1 font-display text-[22px] text-fg">{title}</span>
              <IconButton label={t("common.close")} onClick={() => setOpen(false)}>
                <X />
              </IconButton>
            </div>

            <div className="flex flex-1 flex-col gap-6 overflow-auto px-6 py-5">{children}</div>

            <div className="flex items-center gap-3 border-t border-line px-6 py-4">
              <Button variant="secondary" onClick={onClear}>{t("directory.clear")}</Button>
              <Button className="flex-1" onClick={() => setOpen(false)}>{done}</Button>
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

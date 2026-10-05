"use client";

import * as React from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/**
 * Above this many answers, the list gets a box to type in. Below it, reading
 * the four of them is faster than reaching for a search nobody needed.
 */
const SEARCHABLE_FROM = 6;

export interface MultiOption {
  value: string;
  label: string;
}

/**
 * A field where more than one answer is true at once.
 *
 * A control of ours rather than a native multiple select, which no operating
 * system draws usably and which asks somebody to hold a modifier key to pick a
 * second answer. Closed, it says what has been chosen; open, it is a list of
 * boxes.
 */
export function MultiSelect({
  label,
  options,
  value,
  onChange,
  summary,
}: {
  label: string;
  options: MultiOption[];
  value: string[];
  onChange: (next: string[]) => void;
  /** What the closed control says when something is chosen. */
  summary?: (chosen: MultiOption[]) => string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [above, setAbove] = React.useState(false);
  const [room, setRoom] = React.useState(256);
  const root = React.useRef<HTMLDivElement>(null);

  /* A list that would run off the bottom of the window opens upwards. */
  React.useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const box = root.current?.getBoundingClientRect();
      if (!box) return;
      const below = window.innerHeight - box.bottom - 8;
      const over = box.top - 8;
      const flip = below < 160 && over > below + 80;
      setAbove(flip);
      setRoom(Math.max(120, Math.min(256, flip ? over : below)));
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const away = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const searchable = options.length >= SEARCHABLE_FROM;
  const text = query.trim().toLowerCase();
  const shown = text
    ? options.filter((one) => one.label.toLowerCase().includes(text))
    : options;

  const chosen = options.filter((one) => value.includes(one.value));
  const said = chosen.length === 0
    ? label
    : summary
      ? summary(chosen)
      : chosen.map((one) => one.label).join(", ");

  const toggle = (one: string) =>
    onChange(value.includes(one) ? value.filter((x) => x !== one) : [...value, one]);

  return (
    <div className="relative" ref={root}>
      <button
        type="button"
        onClick={() => {
          setQuery("");
          setOpen((was) => !was);
        }}
        aria-expanded={open}
        aria-label={label}
        className={cn(
          "flex min-h-[var(--d-tap)] w-full items-center justify-between gap-2 rounded-[var(--d-radius-control)]",
          "border border-line-strong bg-surface px-[var(--d-pad-control-x)] text-left shadow-sm",
          "text-[length:var(--d-text-body)] transition-colors hover:border-fg-subtle",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]",
          chosen.length === 0 ? "text-fg-subtle" : "text-fg",
        )}
      >
        <span className="min-w-0 flex-1 truncate">{said}</span>
        <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
      </button>

      {open ? (
        <div
          style={{ maxHeight: room }}
          className={cn(
            "absolute left-0 z-50 w-full overflow-auto rounded-[var(--d-radius-control)]",
            "border border-line bg-surface py-1 shadow-lg",
            above ? "bottom-[calc(100%+4px)]" : "top-[calc(100%+4px)]",
          )}
        >
          {searchable ? (
            <div className="sticky top-0 flex items-center gap-2 border-b border-line bg-surface px-3 py-2">
              <Search className="size-[15px] shrink-0 text-fg-subtle" aria-hidden />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("common.search")}
                aria-label={label}
                autoFocus
                className="min-w-0 flex-1 border-0 bg-transparent text-[length:var(--d-text-body)] text-fg outline-none placeholder:text-fg-subtle"
              />
            </div>
          ) : null}

          {shown.length === 0 ? (
            <p className="px-3 py-2 text-[length:var(--d-text-body)] text-fg-muted">
              {t("common.noMatch")}
            </p>
          ) : null}

          {shown.map((one) => {
            const on = value.includes(one.value);
            return (
              <button
                key={one.value}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggle(one.value)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[length:var(--d-text-body)] text-fg hover:bg-sunken"
              >
                <span
                  className={cn(
                    "grid size-4 shrink-0 place-items-center rounded-[4px] border",
                    on ? "border-transparent bg-primary text-primary-fg" : "border-line-strong",
                  )}
                >
                  {on ? <Check className="size-3" aria-hidden /> : null}
                </span>
                <span className="min-w-0 flex-1 truncate">{one.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

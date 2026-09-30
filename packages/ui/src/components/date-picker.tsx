"use client";

import * as React from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "../lib/cn";

/**
 * A date field and calendar of our own.
 *
 * The native one looks like a different product in every browser, cannot be
 * themed, ignores our density modes and draws a panel we do not control. This
 * one is ours: tokens, three densities, light and dark, and a focus ring.
 *
 * Typing still works, because a volunteer entering a date of birth in 1954
 * should not page through eight hundred months. The field accepts what people
 * type and the calendar is there for the dates they would rather point at.
 */

export interface DatePickerLabels {
  open: string;
  clear: string;
  previousMonth: string;
  nextMonth: string;
  month: string;
  year: string;
  today: string;
}

export interface DatePickerProps {
  /** ISO yyyy-mm-dd, or empty. */
  value: string;
  onChange: (value: string) => void;
  /** Posted with the form, so this works inside a plain server action. */
  name?: string;
  id?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  labels: DatePickerLabels;
  className?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const todayIso = () => {
  const now = new Date();
  return iso(now.getFullYear(), now.getMonth(), now.getDate());
};

/** Parsed as a plain calendar date. `new Date("2026-09-30")` is UTC midnight,
 *  which is the previous day for anybody west of Greenwich. */
function parts(value: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]) - 1;
  const d = Number(match[3]);
  const probe = new Date(y, m, d);
  if (probe.getFullYear() !== y || probe.getMonth() !== m || probe.getDate() !== d) return null;
  return { y, m, d };
}

/**
 * What somebody typed, as a date.
 *
 * Accepts the ISO form, the local short form the field itself prints, and the
 * common separators, because people paste from a spreadsheet. A two digit year
 * is read as this century up to nine years ahead, then the last, so 54 is 1954
 * and 26 is 2026.
 */
export function parseTyped(input: string, locale?: string): string | null {
  const text = input.trim();
  if (!text) return "";

  const direct = parts(text);
  if (direct) return text;

  const bits = text.split(/[^\d]+/).filter(Boolean).map(Number);
  if (bits.length !== 3 || bits.some(Number.isNaN)) return null;

  let y: number, m: number, d: number;
  if (String(bits[0]).length === 4) {
    [y, m, d] = [bits[0]!, bits[1]! - 1, bits[2]!];
  } else {
    // Which of the first two is the month follows the reader's locale, so a
    // British volunteer typing 03/04 gets April and an American gets March.
    const monthFirst = !locale || /^en(-US)?$/i.test(locale) || monthComesFirst(locale);
    [m, d] = monthFirst ? [bits[0]! - 1, bits[1]!] : [bits[1]! - 1, bits[0]!];
    y = bits[2]!;
    if (y < 100) y += y <= new Date().getFullYear() % 100 + 9 ? 2000 : 1900;
  }

  const value = iso(y, m, d);
  return parts(value) ? value : null;
}

function monthComesFirst(locale: string): boolean {
  try {
    const order = new Intl.DateTimeFormat(locale).formatToParts(new Date(2026, 0, 2));
    const first = order.find((p) => p.type === "month" || p.type === "day");
    return first?.type === "month";
  } catch {
    return true;
  }
}

const shortDate = (value: string, locale?: string) => {
  const p = parts(value);
  if (!p) return value;
  return new Date(p.y, p.m, p.d).toLocaleDateString(locale, {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
};

const longDate = (y: number, m: number, d: number, locale?: string) =>
  new Date(y, m, d).toLocaleDateString(locale, {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

/** Sunday first, in the reader's own script. */
function weekdayNames(locale?: string): string[] {
  const base = new Date(2024, 8, 1); // a Sunday
  return Array.from({ length: 7 }, (_, i) =>
    new Date(base.getFullYear(), base.getMonth(), base.getDate() + i)
      .toLocaleDateString(locale, { weekday: "narrow" }),
  );
}

function monthNames(locale?: string): string[] {
  return Array.from({ length: 12 }, (_, m) =>
    new Date(2024, m, 1).toLocaleDateString(locale, { month: "long" }),
  );
}

export function DatePicker({
  value,
  onChange,
  name,
  id,
  min,
  max,
  disabled,
  required,
  placeholder,
  labels,
  className,
  ...rest
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [typed, setTyped] = React.useState<string | null>(null);
  const [locale, setLocale] = React.useState<string | undefined>(undefined);
  const root = React.useRef<HTMLDivElement>(null);
  const grid = React.useRef<HTMLDivElement>(null);

  // Resolved after mount. Reading it during render would make the server and
  // the browser disagree about the format and React would throw out the markup.
  React.useEffect(() => setLocale(navigator.language), []);

  const chosen = parts(value);
  const [cursor, setCursor] = React.useState(() => {
    const now = new Date();
    return { y: chosen?.y ?? now.getFullYear(), m: chosen?.m ?? now.getMonth() };
  });
  const [focused, setFocused] = React.useState<string>(value || todayIso());

  React.useEffect(() => {
    const p = parts(value);
    if (p) {
      setCursor({ y: p.y, m: p.m });
      setFocused(value);
    }
  }, [value]);

  React.useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  const months = React.useMemo(() => monthNames(locale), [locale]);
  const weekdays = React.useMemo(() => weekdayNames(locale), [locale]);

  const outOfRange = (day: string) => (min && day < min) || (max && day > max);

  const commit = (raw: string) => {
    const parsed = parseTyped(raw, locale);
    if (parsed === null) {
      // Unreadable, so put back what was there. Clearing the field on a typo
      // loses a date somebody just read off a form.
      setTyped(null);
      return;
    }
    if (parsed && outOfRange(parsed)) {
      setTyped(null);
      return;
    }
    onChange(parsed);
    setTyped(null);
  };

  const pick = (day: string) => {
    if (outOfRange(day)) return;
    onChange(day);
    setOpen(false);
  };

  const shift = (days: number, months_ = 0) => {
    const p = parts(focused) ?? { y: cursor.y, m: cursor.m, d: 1 };
    const next = new Date(p.y, p.m + months_, p.d + days);
    const value_ = iso(next.getFullYear(), next.getMonth(), next.getDate());
    setFocused(value_);
    setCursor({ y: next.getFullYear(), m: next.getMonth() });
  };

  // The focused day owns the tab stop, so the grid is one stop and the arrows
  // move within it. Thirty tab presses to reach the end of a month is not
  // keyboard support.
  React.useEffect(() => {
    if (!open) return;
    grid.current?.querySelector<HTMLButtonElement>('[data-focused="true"]')?.focus();
  }, [open, focused]);

  const onGridKey = (e: React.KeyboardEvent) => {
    const moves: Record<string, () => void> = {
      ArrowLeft: () => shift(-1),
      ArrowRight: () => shift(1),
      ArrowUp: () => shift(-7),
      ArrowDown: () => shift(7),
      PageUp: () => shift(0, -1),
      PageDown: () => shift(0, 1),
      Home: () => {
        const p = parts(focused);
        if (p) shift(-new Date(p.y, p.m, p.d).getDay());
      },
      End: () => {
        const p = parts(focused);
        if (p) shift(6 - new Date(p.y, p.m, p.d).getDay());
      },
    };
    const move = moves[e.key];
    if (move) {
      e.preventDefault();
      move();
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  const first = new Date(cursor.y, cursor.m, 1);
  const lead = first.getDay();
  const cells: { day: number; month: number; year: number; iso: string }[] = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(cursor.y, cursor.m, 1 - lead + i);
    cells.push({
      day: d.getDate(), month: d.getMonth(), year: d.getFullYear(),
      iso: iso(d.getFullYear(), d.getMonth(), d.getDate()),
    });
  }

  const years = React.useMemo(() => {
    const now = new Date().getFullYear();
    const lo = min ? Number(min.slice(0, 4)) : now - 110;
    const hi = max ? Number(max.slice(0, 4)) : now + 10;
    const span: number[] = [];
    for (let y = hi; y >= lo; y -= 1) span.push(y);
    return span;
  }, [min, max]);

  const today = todayIso();
  const shown = typed ?? (value ? shortDate(value, locale) : "");

  return (
    <div ref={root} className={cn("relative", className)}>
      {name ? <input type="hidden" name={name} value={value} /> : null}

      <div
        className={cn(
          "flex items-center gap-1 bg-surface rounded-[var(--d-radius-control)]",
          "border border-line-strong shadow-sm",
          "transition-[border-color,box-shadow] duration-instant ease-out",
          "hover:border-fg-subtle focus-within:border-fg-subtle",
          rest["aria-invalid"] && "border-danger ring-2 ring-danger/25",
          disabled && "opacity-45 pointer-events-none",
        )}
      >
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          value={shown}
          onChange={(e) => setTyped(e.target.value)}
          onBlur={(e) => { if (typed !== null) commit(e.target.value); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && typed !== null) {
              e.preventDefault();
              commit((e.target as HTMLInputElement).value);
            }
          }}
          className={cn(
            "w-full bg-transparent text-fg placeholder:text-fg-subtle outline-none",
            "min-h-[var(--d-tap)] pl-[var(--d-pad-control-x)] text-[length:var(--d-text-body)]",
          )}
          {...rest}
        />

        {value && !disabled ? (
          <button
            type="button"
            aria-label={labels.clear}
            onClick={() => { onChange(""); setTyped(null); }}
            className="shrink-0 rounded-md p-1 text-fg-subtle hover:bg-sunken hover:text-fg"
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : null}

        <button
          type="button"
          aria-label={labels.open}
          aria-expanded={open}
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className="mr-1 shrink-0 rounded-md p-1.5 text-fg-muted hover:bg-sunken hover:text-fg"
        >
          <CalendarDays className="size-4" aria-hidden />
        </button>
      </div>

      {open ? (
        <div
          role="dialog"
          aria-label={labels.open}
          className={cn(
            "absolute z-50 mt-1 w-[19rem] p-3",
            "rounded-[var(--d-radius-control)] border border-line bg-surface shadow-lg",
          )}
        >
          <div className="mb-3 flex items-center gap-2">
            <select
              aria-label={labels.month}
              value={cursor.m}
              onChange={(e) => setCursor((c) => ({ ...c, m: Number(e.target.value) }))}
              className="min-w-0 flex-1 rounded-md border border-line-strong bg-surface px-2 py-1.5 text-label text-fg"
            >
              {months.map((label, i) => (
                <option key={label} value={i}>{label}</option>
              ))}
            </select>

            <select
              aria-label={labels.year}
              value={cursor.y}
              onChange={(e) => setCursor((c) => ({ ...c, y: Number(e.target.value) }))}
              className="rounded-md border border-line-strong bg-surface px-2 py-1.5 text-label text-fg"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <button
              type="button"
              aria-label={labels.previousMonth}
              onClick={() => setCursor((c) => {
                const d = new Date(c.y, c.m - 1, 1);
                return { y: d.getFullYear(), m: d.getMonth() };
              })}
              className="rounded-md p-1.5 text-fg-muted hover:bg-sunken hover:text-fg"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-label={labels.nextMonth}
              onClick={() => setCursor((c) => {
                const d = new Date(c.y, c.m + 1, 1);
                return { y: d.getFullYear(), m: d.getMonth() };
              })}
              className="rounded-md p-1.5 text-fg-muted hover:bg-sunken hover:text-fg"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-0.5">
            {weekdays.map((w, i) => (
              <span key={i} className="py-1 text-center text-caption text-fg-subtle" aria-hidden>
                {w}
              </span>
            ))}
          </div>

          <div
            ref={grid}
            role="grid"
            onKeyDown={onGridKey}
            className="grid grid-cols-7 gap-0.5"
          >
            {cells.map((cell) => {
              const selected = cell.iso === value;
              const outside = cell.month !== cursor.m;
              const blocked = Boolean(outOfRange(cell.iso));
              return (
                <button
                  key={cell.iso}
                  type="button"
                  role="gridcell"
                  aria-selected={selected}
                  aria-disabled={blocked || undefined}
                  aria-label={longDate(cell.year, cell.month, cell.day, locale)}
                  data-focused={cell.iso === focused}
                  tabIndex={cell.iso === focused ? 0 : -1}
                  onClick={() => pick(cell.iso)}
                  onFocus={() => setFocused(cell.iso)}
                  className={cn(
                    "flex h-9 items-center justify-center rounded-md",
                    "text-[length:var(--d-text-body)] transition-colors duration-instant",
                    selected
                      ? "bg-primary text-primary-fg"
                      : blocked
                        ? "text-fg-subtle opacity-40 cursor-not-allowed"
                        : outside
                          ? "text-fg-subtle hover:bg-sunken"
                          : "text-fg hover:bg-sunken",
                    cell.iso === today && !selected && "ring-1 ring-primary/50",
                  )}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => pick(today)}
              disabled={Boolean(outOfRange(today))}
              className="rounded-md px-2 py-1 text-label text-primary hover:bg-sunken disabled:opacity-40"
            >
              {labels.today}
            </button>
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className="rounded-md px-2 py-1 text-label text-fg-muted hover:bg-sunken hover:text-fg"
            >
              {labels.clear}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

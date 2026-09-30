"use client";

import * as React from "react";
import { Clock, X } from "lucide-react";
import { cn } from "../lib/cn";

/**
 * A time field and a list of times.
 *
 * The native one is three spin columns in a panel we cannot theme, and picking
 * 09:00 from it takes more presses than typing it. This one takes what somebody
 * types, in any of the forms they type it, and offers the quarter hours for the
 * times they would rather point at.
 *
 * The value is always 24-hour HH:MM, which is what the database holds. What is
 * shown is the reader's own clock, so an American sees 9:00 AM and a German
 * sees 09:00.
 */

export interface TimePickerLabels {
  open: string;
  clear: string;
}

export interface TimePickerProps {
  /** 24-hour HH:MM, or empty. */
  value: string;
  onChange: (value: string) => void;
  name?: string;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  /** Minutes between the offered times. Fifteen covers how services are set. */
  step?: number;
  labels: TimePickerLabels;
  className?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * What somebody typed, as a time.
 *
 * Takes "9", "9:00", "0900", "9am", "9 AM", "9.30pm", "21:30". A bare number
 * under 24 is an hour, which is how people write service times.
 */
export function parseTime(input: string): string | null {
  const text = input.trim().toLowerCase();
  if (!text) return "";

  const meridiem = /(^|[^a-z])(a|p)\.?m?\.?$/.exec(text);
  const suffix = meridiem?.[2];
  const digits = text.replace(/[ap]\.?m?\.?$/, "").trim();

  const match = /^(\d{1,2})(?:[:.\s]?(\d{2}))?$/.exec(digits);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = match[2] === undefined ? 0 : Number(match[2]);

  // "0900" is nine, not ninety hours.
  if (match[2] === undefined && digits.length === 4) {
    hour = Number(digits.slice(0, 2));
    return build(hour, Number(digits.slice(2)), suffix);
  }
  return build(hour, minute, suffix);
}

function build(hour: number, minute: number, suffix?: string): string | null {
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (minute < 0 || minute > 59) return null;

  if (suffix === "p" && hour < 12) hour += 12;
  if (suffix === "a" && hour === 12) hour = 0;
  if (hour < 0 || hour > 23) return null;

  return `${pad(hour)}:${pad(minute)}`;
}

/** "09:00" as the reader's clock reads it. */
export function formatTime(value: string, locale?: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return value;
  const d = new Date();
  d.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return d.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
}

export function TimePicker({
  value,
  onChange,
  name,
  id,
  disabled,
  required,
  placeholder,
  step = 15,
  labels,
  className,
  ...rest
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [typed, setTyped] = React.useState<string | null>(null);
  const [locale, setLocale] = React.useState<string | undefined>(undefined);
  const [active, setActive] = React.useState(0);
  const root = React.useRef<HTMLDivElement>(null);
  const input = React.useRef<HTMLInputElement>(null);
  const listId = React.useId();

  // Resolved after mount, so the server and the browser agree on the markup.
  React.useEffect(() => setLocale(navigator.language), []);

  const options = React.useMemo(() => {
    const out: string[] = [];
    for (let m = 0; m < 24 * 60; m += step) {
      out.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
    }
    return out;
  }, [step]);

  const matches = React.useMemo(() => {
    const q = (typed ?? "").trim();
    if (!q) return options;
    const parsed = parseTime(q);
    // A readable entry scrolls the list to it. An unreadable one narrows by
    // what the times read like, so typing "9" offers every nine.
    if (parsed) return options.filter((o) => o >= parsed);
    return options.filter((o) => formatTime(o, locale).toLowerCase().includes(q.toLowerCase()));
  }, [options, typed, locale]);

  React.useEffect(() => setActive(0), [typed, open]);

  React.useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  const choose = (time: string) => {
    onChange(time);
    setTyped(null);
    setOpen(false);
    input.current?.focus();
  };

  const commit = (raw: string) => {
    const parsed = parseTime(raw);
    // Unreadable, so put back what was there rather than emptying the field.
    if (parsed === null) return setTyped(null);
    onChange(parsed);
    setTyped(null);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return setOpen(true);
      const stepBy = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (matches.length === 0 ? 0 : (i + stepBy + matches.length) % matches.length));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const option = open ? matches[active] : undefined;
      if (option && typed === null) choose(option);
      else commit((e.target as HTMLInputElement).value);
      setOpen(false);
      return;
    }
    if (e.key === "Escape" && open) {
      e.preventDefault();
      setTyped(null);
      setOpen(false);
    }
  };

  const shown = typed ?? (value ? formatTime(value, locale) : "");

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
          ref={input}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={open && matches[active] ? `${listId}-${active}` : undefined}
          autoComplete="off"
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          value={shown}
          onChange={(e) => { setTyped(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={(e) => { if (typed !== null) commit(e.target.value); }}
          onKeyDown={onKeyDown}
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
            onClick={() => { onChange(""); setTyped(null); input.current?.focus(); }}
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
          <Clock className="size-4" aria-hidden />
        </button>
      </div>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          className={cn(
            "absolute z-50 mt-1 max-h-64 w-full min-w-36 overflow-y-auto p-1",
            "rounded-[var(--d-radius-control)] border border-line bg-surface shadow-lg",
          )}
        >
          {matches.map((time, i) => (
            <li
              key={time}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={time === value}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => { e.preventDefault(); choose(time); }}
              className={cn(
                "cursor-pointer rounded-md px-2 py-2",
                "text-[length:var(--d-text-body)] text-fg",
                i === active && "bg-sunken",
                time === value && "font-medium text-primary",
              )}
            >
              {formatTime(time, locale)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

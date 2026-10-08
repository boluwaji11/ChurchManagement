"use client";

import * as React from "react";
import { Clock, X } from "lucide-react";
import { cn } from "../lib/cn";
import { useDrop } from "../lib/drop";

/**
 * A time field and a list of times.
 *
 * The native one is three spin columns in a panel we cannot theme, and picking
 * 09:00 from it takes more presses than typing it. This one takes what somebody
 * types, in any of the forms they type it, and offers the quarter hours for the
 * times they would rather point at.
 *
 * The value is always 24-hour HH:MM, which is what the database holds. What is
 * shown is the twelve hour clock with AM or PM, which is how a service time is
 * said out loud and how it goes on the noticeboard.
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
  /** The earliest time this field accepts, as 24-hour HH:MM. */
  min?: string;
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

/**
 * "09:00" as a church says it: 9:00 AM.
 *
 * Twelve hour with a meridiem, whatever the browser's locale would have
 * chosen. A service time is spoken aloud and printed on a noticeboard, and
 * "21:00" is not how anybody says the evening service.
 */
export function formatTime(value: string, locale?: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return value;
  const d = new Date();
  d.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return d.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit", hour12: true });
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
  min,
  labels,
  className,
  ...rest
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [typed, setTyped] = React.useState<string | null>(null);
  const [locale, setLocale] = React.useState<string | undefined>(undefined);
  const [active, setActive] = React.useState(0);
  const root = React.useRef<HTMLDivElement>(null);
  const list = React.useRef<HTMLUListElement>(null);
  const input = React.useRef<HTMLInputElement>(null);
  const listId = React.useId();

  // Resolved after mount, so the server and the browser agree on the markup.
  React.useEffect(() => setLocale(navigator.language), []);

  const options = React.useMemo(() => {
    const out: string[] = [];
    for (let m = 0; m < 24 * 60; m += step) {
      const time = `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
      if (!min || time >= min) out.push(time);
    }
    return out;
  }, [step, min]);

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
      const target = e.target as Node;
      if (root.current?.contains(target) || list.current?.contains(target)) return;
      setOpen(false);
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
    // Unreadable, or before the floor this field was given, so put back what
    // was there rather than emptying the field or taking a time it refuses.
    if (parsed === null) return setTyped(null);
    if (parsed && min && parsed < min) return setTyped(null);
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

  const drop = useDrop(open, root, { height: 288 });

  // Opening on an empty field puts nine in the morning under the cursor rather
  // than midnight, and opening on a value puts that value there.
  React.useEffect(() => {
    if (!open) return;
    if (typed === null) {
      const at = matches.indexOf(value || (min && min > "09:00" ? matches[0] ?? "" : "09:00"));
      if (at >= 0) setActive(at);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    list.current
      ?.querySelector<HTMLLIElement>(`[data-active="true"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

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
            /* R24.6. 32px, so the mark inside a field is a target a thumb
               hits. The field keeps its height: it is 40px at a desk and 44
               on a phone, and the button sits inside either. */
            className="grid size-8 shrink-0 place-items-center rounded-md text-fg-subtle hover:bg-sunken hover:text-fg"
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
          className="mr-1 grid size-8 shrink-0 place-items-center rounded-md text-fg-muted hover:bg-sunken hover:text-fg"
        >
          <Clock className="size-4" aria-hidden />
        </button>
      </div>

      {open ? (
        <ul
          ref={list}
          id={listId}
          role="listbox"
          style={drop}
          className={cn(
            "z-50 min-w-36 overflow-y-auto p-1",
            "rounded-[var(--d-radius-control)] border border-line bg-surface shadow-lg",
          )}
        >
          {matches.map((time, i) => (
            <li
              key={time}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={time === value}
              data-active={i === active}
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

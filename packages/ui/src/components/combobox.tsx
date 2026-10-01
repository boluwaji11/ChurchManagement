"use client";

import * as React from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "../lib/cn";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Matched on as well as the label, so an email address finds the person. */
  keywords?: string;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Shown when nothing matches what was typed. */
  emptyLabel: string;
  clearLabel: string;
  "aria-label"?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * A select you can type into.
 *
 * A church of five hundred people in a plain select is a scroll, and a volunteer
 * who knows the name they want should not have to find it. This is the ARIA
 * combobox pattern: typing filters, the arrow keys move, Enter chooses, Escape
 * closes and puts back what was there.
 *
 * Matching ignores case and accents, and matches anywhere in the string rather
 * than only at the start, because people search for a surname.
 */
const fold = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function Combobox({
  options,
  value,
  onChange,
  placeholder,
  emptyLabel,
  clearLabel,
  id,
  disabled,
  className,
  ...rest
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const root = React.useRef<HTMLDivElement>(null);
  const input = React.useRef<HTMLInputElement>(null);
  const listId = React.useId();

  const chosen = options.find((o) => o.value === value);

  const matches = React.useMemo(() => {
    const q = fold(query.trim());
    if (!q) return options;
    return options.filter(
      (o) => fold(o.label).includes(q) || (o.keywords ? fold(o.keywords).includes(q) : false),
    );
  }, [options, query]);

  // A filter that leaves the highlight on row nine of a list that now has two
  // rows highlights nothing, and Enter then chooses nothing.
  React.useEffect(() => setActive(0), [query, open]);

  React.useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  const choose = (option: ComboboxOption) => {
    onChange(option.value);
    setQuery("");
    setOpen(false);
    input.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (matches.length === 0 ? 0 : (i + step + matches.length) % matches.length));
      return;
    }
    if (e.key === "Home" && open) {
      e.preventDefault();
      setActive(0);
      return;
    }
    if (e.key === "End" && open) {
      e.preventDefault();
      setActive(Math.max(0, matches.length - 1));
      return;
    }
    if (e.key === "Enter" && open) {
      const option = matches[active];
      if (option) {
        e.preventDefault();
        choose(option);
      }
      return;
    }
    if (e.key === "Escape" && open) {
      e.preventDefault();
      setQuery("");
      setOpen(false);
    }
  };

  return (
    <div ref={root} className={cn("relative", className)}>
      <div
        className={cn(
          "flex items-center gap-1 bg-surface rounded-[var(--d-radius-control)]",
          "border border-line-strong shadow-sm",
          "transition-[border-color,box-shadow] duration-instant ease-out",
          "hover:border-fg-subtle focus-within:border-fg-subtle",
          "has-[input[aria-invalid]]:border-danger-text",
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
          // The chosen name stays in the field when it is not being searched, so
          // the control reads as an answer rather than an empty box.
          value={open ? query : (chosen?.label ?? "")}
          placeholder={chosen ? undefined : placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={cn(
            "w-full bg-transparent text-fg placeholder:text-fg-subtle outline-none",
            "min-h-[var(--d-tap)] pl-[var(--d-pad-control-x)] text-[length:var(--d-text-body)]",
          )}
          {...rest}
        />

        {chosen && !disabled ? (
          <button
            type="button"
            aria-label={clearLabel}
            onClick={() => {
              onChange("");
              setQuery("");
              input.current?.focus();
            }}
            className="shrink-0 rounded-md p-1 text-fg-subtle hover:bg-sunken hover:text-fg"
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : null}

        <ChevronDown className="mr-2 size-4 shrink-0 opacity-60" aria-hidden />
      </div>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          className={cn(
            "absolute z-50 mt-1 max-h-64 w-full overflow-y-auto p-1",
            "rounded-[var(--d-radius-control)] border border-line bg-surface shadow-lg",
          )}
        >
          {matches.length === 0 ? (
            <li className="px-2 py-2 text-[length:var(--d-text-body)] text-fg-muted">
              {emptyLabel}
            </li>
          ) : null}

          {matches.map((option, i) => (
            <li
              key={option.value}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={option.value === value}
              onMouseEnter={() => setActive(i)}
              // mousedown, because the input's blur would otherwise close the
              // list before the click on it ever lands.
              onMouseDown={(e) => {
                e.preventDefault();
                choose(option);
              }}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md px-2 py-2",
                "text-[length:var(--d-text-body)] text-fg",
                i === active && "bg-sunken",
              )}
            >
              <Check
                className={cn("size-4 shrink-0", option.value === value ? "opacity-100" : "opacity-0")}
                aria-hidden
              />
              {option.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

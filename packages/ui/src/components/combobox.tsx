"use client";

import * as React from "react";
import { createPortal } from "react-dom";
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
  /** A mark at the head of the field, such as a magnifier on a lookup. */
  icon?: React.ReactNode;
  /** Shown when nothing matches what was typed. */
  emptyLabel: string;
  /**
   * A row pinned under the options, inside the panel.
   *
   * For the one action that belongs with a list rather than beside it: making
   * the thing somebody came looking for and did not find. It sits in the panel
   * so it is where the eye already is, and it is not an option, so it is never
   * chosen by the keyboard walking the list.
   */
  /** Pinned above the list, never filtered. */
  header?: React.ReactNode;
  footer?: React.ReactNode;
  clearLabel: string;
  /** False where the field always holds one of its options. */
  clearable?: boolean;
  /**
   * Told what has been typed, for a list that comes from the server.
   *
   * With it, the options are taken as given and the typing is not filtered
   * here as well, because the answer has already been narrowed once.
   */
  onQueryChange?: (query: string) => void;
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
  icon,
  emptyLabel,
  header,
  footer,
  clearLabel,
  clearable = true,
  onQueryChange,
  id,
  disabled,
  className,
  ...rest
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const root = React.useRef<HTMLDivElement>(null);
  const list = React.useRef<HTMLUListElement>(null);
  const input = React.useRef<HTMLInputElement>(null);
  const listId = React.useId();
  const [above, setAbove] = React.useState(false);
  // How tall the list may be where it is, so it shortens rather than covering
  // what is around it.
  const [room, setRoom] = React.useState(256);
  /*
   * Where the list goes, in the window's own coordinates.
   *
   * The list is drawn on the body rather than inside the field, because a field
   * inside anything that scrolls (a table in a pane, a panel from the right)
   * has its list clipped by that container's edge, and a list cut off halfway
   * down its second row is the control looking broken.
   */
  const [box, setBox] = React.useState<{ left: number; width: number; top: number } | null>(null);

  /*
   * A list that would run off the bottom of the window opens upwards instead.
   * Measured each time it opens rather than once, because the field moves as
   * the page scrolls and as the form above it grows.
   */
  React.useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const box = root.current?.getBoundingClientRect();
      if (!box) return;
      const below = window.innerHeight - box.bottom - 8;
      const over = box.top - 8;
      // Downwards unless there is really not the room, and then only where
      // upwards is meaningfully better. A list that flips for forty pixels
      // reads as the page jumping.
      const flip = below < 160 && over > below + 80;
      setAbove(flip);
      setRoom(Math.max(120, Math.min(256, flip ? over : below)));
      setBox({
        left: box.left,
        width: box.width,
        top: flip ? box.top : box.bottom,
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  const chosen = options.find((o) => o.value === value);

  const matches = React.useMemo(() => {
    if (onQueryChange) return options;
    const q = fold(query.trim());
    if (!q) return options;
    return options.filter(
      (o) => fold(o.label).includes(q) || (o.keywords ? fold(o.keywords).includes(q) : false),
    );
  }, [options, query, onQueryChange]);

  // A filter that leaves the highlight on row nine of a list that now has two
  // rows highlights nothing, and Enter then chooses nothing.
  React.useEffect(() => setActive(0), [query, open]);

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
      {/* The whole field is the control. A press on its padding, or on the
          chevron, opens the list, because a box with an arrow on it that only
          answers a press on its text reads as broken. */}
      <div
        onMouseDown={(e) => {
          if (e.target !== e.currentTarget) return;
          e.preventDefault();
          setOpen(true);
          input.current?.focus();
        }}
        className={cn(
          "relative flex cursor-pointer items-center gap-1 bg-surface rounded-[var(--d-radius-control)]",
          "border border-line-strong shadow-sm",
          "transition-[border-color,box-shadow] duration-instant ease-out",
          "hover:border-fg-subtle focus-within:border-fg-subtle",
          "has-[input[aria-invalid]]:border-danger-text",
          disabled && "opacity-45 pointer-events-none",
        )}
      >
        {icon ? (
          <span
            aria-hidden
            className="pointer-events-none absolute left-[var(--d-pad-control-x)] text-fg-subtle [&_svg]:size-4"
          >
            {icon}
          </span>
        ) : null}

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
            onQueryChange?.(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          // Focus only fires the first time. Without this, a field that has
          // been opened and closed once sits there looking dead under the
          // pointer, because the cursor is already in it.
          onMouseDown={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={cn(
            "w-full bg-transparent text-fg placeholder:text-fg-subtle outline-none",
            "min-h-[var(--d-tap)] text-[length:var(--d-text-body)]",
            icon
              ? "pl-[calc(var(--d-pad-control-x)+1.5rem)]"
              : "pl-[var(--d-pad-control-x)]",
          )}
          {...rest}
        />

        {chosen && clearable && !disabled ? (
          <button
            type="button"
            aria-label={clearLabel}
            onClick={() => {
              onChange("");
              setQuery("");
              input.current?.focus();
            }}
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
          // The input carries the combobox role and every keyboard path into
          // the list, so this is a target for the pointer and nothing else.
          aria-hidden
          tabIndex={-1}
          disabled={disabled}
          onMouseDown={(e) => {
            e.preventDefault();
            if (open) {
              setOpen(false);
              return;
            }
            setOpen(true);
            input.current?.focus();
          }}
          className="mr-1 grid size-8 shrink-0 cursor-pointer place-items-center rounded-md text-fg-subtle hover:bg-sunken hover:text-fg"
        >
          <ChevronDown className="size-4 opacity-60" aria-hidden />
        </button>
      </div>

      {open && box ? createPortal(
        <ul
          ref={list}
          id={listId}
          role="listbox"
          style={{
            maxHeight: room,
            left: box.left,
            width: box.width,
            ...(above
              ? { bottom: Math.round(window.innerHeight - box.top) + 4 }
              : { top: box.top + 4 }),
          }}
          /*
           * R24.6. The list is portalled to the body so no panel can clip it,
           * and a modal above it turns the body's pointer events off. This
           * takes them back for itself, and the mark says what it is so a
           * dialog does not mistake a press here for a press outside.
           */
          data-portal-list=""
          className={cn(
            "pointer-events-auto fixed z-50 overflow-y-auto p-1",
            "rounded-[var(--d-radius-control)] border border-line bg-surface shadow-lg",
          )}
        >
          {header ? (
            <li className={cn("px-1 pb-1", (matches.length > 0 || emptyLabel) && "mb-1 border-b border-line")}>
              {header}
            </li>
          ) : null}

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
                "text-[length:var(--d-text-body)]",
                /* R24.6. The one that is chosen is marked the way the Select
                   beside it marks its own, so two pickers on one screen do
                   not disagree about what chosen looks like. */
                option.value === value
                  ? "bg-primary-soft font-semibold text-primary"
                  : "text-fg",
                i === active && option.value !== value && "bg-sunken",
              )}
            >
              <Check
                className={cn("size-4 shrink-0", option.value === value ? "opacity-100" : "opacity-0")}
                aria-hidden
              />
              {option.label}
            </li>
          ))}

          {footer ? (
            <li className={cn("px-1 pt-1", matches.length > 0 && "mt-1 border-t border-line")}>
              {footer}
            </li>
          ) : null}
        </ul>,
        document.body,
      ) : null}
    </div>
  );
}

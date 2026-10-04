"use client";
import * as React from "react";
import * as P from "@radix-ui/react-select";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "../lib/cn";
import { useFieldControl } from "./field";

/**
 * Wrapped rather than re-exported so Field knows to send the trigger its id and
 * error state by context: the Radix root draws no element of its own.
 */
export function Select(props: React.ComponentProps<typeof P.Root>) {
  return <P.Root {...props} />;
}
Select.hearthFieldManaged = true;

export const SelectValue = P.Value;

export const SelectTrigger = React.forwardRef<
  React.ComponentRef<typeof P.Trigger>,
  React.ComponentPropsWithoutRef<typeof P.Trigger>
>(({ className, children, ...props }, ref) => {
  const field = useFieldControl();
  return (
  <P.Trigger
    ref={ref}
    id={props.id ?? field?.id}
    aria-invalid={props["aria-invalid"] ?? (field?.invalid || undefined)}
    aria-describedby={props["aria-describedby"] ?? field?.describedBy}
    aria-required={props["aria-required"] ?? field?.required}
    className={cn(
      "inline-flex w-full items-center justify-between gap-2 bg-surface text-fg text-left",
      "min-h-[var(--d-tap)] px-[var(--d-pad-control-x)] rounded-[var(--d-radius-control)]",
      "text-[length:var(--d-text-body)] border border-line-strong shadow-sm",
      "transition-colors duration-instant ease-out hover:border-fg-subtle",
      "disabled:opacity-45 disabled:pointer-events-none",
      "data-[placeholder]:text-fg-subtle",
      // The chosen value stays on one line. A long one is cut with an
      // ellipsis rather than growing the control to two rows.
      "overflow-hidden [&>span]:min-w-0 [&>span]:flex-1 [&>span]:truncate",
      "aria-invalid:border-danger-text",
      className,
    )}
    {...props}
  >
    {children}
    <P.Icon asChild>
      <ChevronDown className="size-4 opacity-60 shrink-0" />
    </P.Icon>
  </P.Trigger>
  );
});
SelectTrigger.displayName = "SelectTrigger";

/** Below this many options, a box to type in is in the way rather than a help. */
const SEARCH_FROM = 8;

/** The words inside an item, so typing can match them. */
function textOf(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join(" ");
  if (React.isValidElement(node)) {
    return textOf((node.props as { children?: React.ReactNode }).children);
  }
  return "";
}

const fold = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export const SelectContent = React.forwardRef<
  React.ComponentRef<typeof P.Content>,
  React.ComponentPropsWithoutRef<typeof P.Content> & {
    /** What the box to type in says. Defaults to nothing. */
    searchLabel?: string;
  }
>(({ className, children, position = "popper", searchLabel, ...props }, ref) => {
  const [query, setQuery] = React.useState("");
  const box = React.useRef<HTMLInputElement>(null);
  const items = React.Children.toArray(children);

  /*
   * Every list long enough to scroll gets a box to type in. One place rather
   * than thirty screens deciding for themselves, so a dropdown behaves the same
   * everywhere in the product.
   */
  const searchable = items.length >= SEARCH_FROM;
  const q = fold(query.trim());
  const shown = q
    ? items.filter((item) =>
        React.isValidElement(item)
          ? fold(textOf((item.props as { children?: React.ReactNode }).children)).includes(q)
          : true,
      )
    : items;

  return (
    <P.Portal>
      <P.Content
        ref={ref}
        position={position}
        sideOffset={6}
        onCloseAutoFocus={() => setQuery("")}
        className={cn(
          "z-50 min-w-[10rem] overflow-hidden rounded-lg border border-line bg-surface shadow-lg p-1",
          "data-[state=open]:animate-[hearth-rise_var(--duration-fast)_var(--ease-out)]",
          className,
        )}
        {...props}
      >
        {searchable ? (
          <div
            className="flex items-center gap-2 border-b border-line px-2 pb-1.5"
            // Radix puts focus on the list as it opens and keeps every keystroke
            // for its own jump-to-letter. Taking focus back once it has settled
            // gives the box the typing instead.
            ref={() => {
              setTimeout(() => box.current?.focus(), 0);
            }}
          >
            <Search className="size-4 shrink-0 text-fg-subtle" aria-hidden />
            <input
              ref={box}
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={searchLabel}
              // Radix listens for typing to jump between items, which would
              // swallow every letter before it reached this box.
              onKeyDown={(e) => {
                if (e.key !== "Escape" && e.key !== "Enter") e.stopPropagation();
              }}
              className="h-8 w-full bg-transparent text-[length:var(--d-text-body)] text-fg outline-none placeholder:text-fg-subtle"
            />
          </div>
        ) : null}

        <P.Viewport className="max-h-72">{shown}</P.Viewport>
      </P.Content>
    </P.Portal>
  );
});
SelectContent.displayName = "SelectContent";

export const SelectItem = React.forwardRef<
  React.ComponentRef<typeof P.Item>,
  React.ComponentPropsWithoutRef<typeof P.Item>
>(({ className, children, ...props }, ref) => (
  <P.Item
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center gap-2 rounded-md",
      "py-2 pl-2 pr-8 text-[length:var(--d-text-body)] outline-none",
      "data-[highlighted]:bg-sunken data-[state=checked]:text-primary",
      "data-[disabled]:opacity-45 data-[disabled]:pointer-events-none",
      className,
    )}
    {...props}
  >
    <P.ItemText>{children}</P.ItemText>
    <P.ItemIndicator className="absolute right-2 flex items-center">
      <Check className="size-4" />
    </P.ItemIndicator>
  </P.Item>
));
SelectItem.displayName = "SelectItem";

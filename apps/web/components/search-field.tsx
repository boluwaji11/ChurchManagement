"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { Input, cn, Tooltip } from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/**
 * R24.6. A box to search in, with the way back out of it.
 *
 * A magnifier on the left so it reads as a search rather than a field, and a
 * cross on the right once there is something to clear. Somebody who has typed
 * four characters and wants the whole list back should not have to hold
 * backspace to get it.
 *
 * One width, written here, so the box over the members list and the box over
 * the groups are the same box. A caller that genuinely needs another width
 * passes one and it wins.
 */
export function SearchField({
  value,
  onChange,
  placeholder,
  className,
  autoFocus,
}: {
  value: string;
  onChange: (next: string) => void;
  /** Doubles as the accessible name, since a search box carries no label. */
  placeholder: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const input = React.useRef<HTMLInputElement>(null);

  return (
    <div className={cn("relative w-full max-w-[340px]", className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle"
        aria-hidden
      />

      <Input
        ref={input}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoFocus={autoFocus}
        className="pr-10 pl-9 [&::-webkit-search-cancel-button]:appearance-none"
      />

      {value ? (
        <Tooltip content={t("search.clear")}>
        <button
          type="button"
          aria-label={t("search.clear")}
          onClick={() => {
            onChange("");
            input.current?.focus();
          }}
          className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-fg-subtle hover:bg-sunken hover:text-fg"
        >
          <X className="size-4" aria-hidden />
        </button>
        </Tooltip>
      ) : null}
    </div>
  );
}

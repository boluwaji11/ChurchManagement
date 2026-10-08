"use client";

import * as React from "react";
import { currencyMark, groupAmount } from "@/lib/money";

/**
 * R13.x. An amount, with the currency beside it.
 *
 * The mark sits inside the field with the number rather than in the label, so
 * somebody typing 56 can see what they are typing. It is the same pairing the
 * giving page uses.
 */
export function MoneyInput({
  value,
  onChange,
  currency,
  ...rest
}: {
  value: string;
  onChange: (value: string) => void;
  currency?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <span className="flex min-h-[var(--d-tap)] items-center gap-1 rounded-[var(--d-radius-control)] border border-line-strong bg-surface px-[var(--d-pad-control-x)] shadow-sm transition-[border-color] duration-instant ease-out hover:border-fg-subtle focus-within:border-fg-subtle">
      <span className="text-[length:var(--d-text-body)] text-fg-subtle">
        {currencyMark(currency)}
      </span>
      <input
        value={value}
        /* R13.x. Grouped as it is typed, because 123290.03 and 123,290.03
           are the same number and only one of them can be read at a glance. */
        onChange={(e) => onChange(groupAmount(e.target.value))}
        inputMode="decimal"
        className="min-w-0 flex-1 bg-transparent text-[length:var(--d-text-body)] text-fg outline-none placeholder:text-fg-subtle"
        {...rest}
      />
    </span>
  );
}

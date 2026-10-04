"use client";

import * as React from "react";
import { Input } from "@hearth/ui";

/**
 * R2.4. A phone number, punctuated as it is typed.
 *
 * North America is the market this ships into, so ten digits are written the
 * way a church writes them on a card: (254)455-2345. A leading 1 is kept in
 * front of it, and anything starting with + is left exactly as typed, because
 * guessing at the grouping of an international number gets it wrong.
 *
 * Formatting on the way in rather than on the way out means the number reads
 * the same in the directory, in an export and on a printed roster, without
 * every one of those having to know the rule.
 */
export function formatPhone(raw: string): string {
  // An international number is the typist's business.
  if (raw.trim().startsWith("+")) return raw;

  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return "";

  // A leading 1 is the country code, held aside so the ten digits after it
  // group the same way they would on their own.
  const lead = digits.length > 10 && digits.startsWith("1") ? "1 " : "";
  const rest = lead ? digits.slice(1, 11) : digits.slice(0, 10);

  // Anything past eleven digits is not a North American number, so it is left
  // as the digits the typist entered.
  if (digits.length > 11) return raw;

  if (rest.length <= 3) return `${lead}${rest}`;
  if (rest.length <= 6) return `${lead}(${rest.slice(0, 3)})${rest.slice(3)}`;
  return `${lead}(${rest.slice(0, 3)})${rest.slice(3, 6)}-${rest.slice(6)}`;
}

export function PhoneInput({
  name,
  defaultValue,
  disabled,
  ...rest
}: Omit<React.ComponentProps<typeof Input>, "type" | "value" | "onChange">) {
  const [value, setValue] = React.useState(() => formatPhone(String(defaultValue ?? "")));

  return (
    <Input
      {...rest}
      name={name}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      disabled={disabled}
      value={value}
      onChange={(e) => setValue(formatPhone(e.target.value))}
    />
  );
}

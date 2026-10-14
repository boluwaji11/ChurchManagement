"use client";

import * as React from "react";
import { t } from "@connectapp/i18n";

/**
 * R16.4. The marks a message can carry, as a church reads them.
 *
 * The same three the letter offers that make sense in an email. A letter's
 * address and today's date belong on paper; a church's own phone and website
 * belong in the signature it writes once rather than in a mark it inserts.
 *
 * In one place because the composer and the template panel write the same
 * messages, and a mark offered in one and missing from the other is a church
 * learning the feature twice.
 */
const FIELDS = [
  { mark: "first", label: "post.field.first" },
  { mark: "name", label: "post.field.name" },
  { mark: "church", label: "post.field.church" },
] as const;

export function DynamicFields({ onInsert }: { onInsert: (text: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-label text-fg">{t("post.fields")}:</span>
      {FIELDS.map((one) => (
        <button
          key={one.mark}
          type="button"
          onClick={() => onInsert(`{${one.mark}}`)}
          className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 text-[13px] text-fg hover:bg-sunken"
        >
          {t(one.label as never)}
          <span className="font-mono text-[11px] text-fg-subtle">{`{${one.mark}}`}</span>
        </button>
      ))}
    </div>
  );
}

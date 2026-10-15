"use client";

import * as React from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Tooltip } from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/**
 * One address, with the two things anybody does to it.
 *
 * The buttons sit on the end of the field rather than under it: the row then
 * reads as one control, and two of these down a screen do not become two rows
 * of loose icons.
 */
export function Copyable({ value, open, label }: { value: string; open?: string; label: string }) {
  const [copied, setCopied] = React.useState(false);

  return (
    <div className="flex items-center gap-1 rounded-[var(--d-radius-control)] border border-line-strong bg-surface pr-1 focus-within:border-fg-subtle">
      <input
        readOnly
        value={value}
        aria-label={label}
        onFocus={(e) => e.currentTarget.select()}
        className="min-w-0 flex-1 bg-transparent px-3 py-2.5 font-mono text-[13px] text-fg outline-none"
      />

      <Tooltip content={copied ? t("joining.copied") : t("joining.copy")}>
        <button
          type="button"
          aria-label={copied ? t("joining.copied") : t("joining.copy")}
          onClick={() => {
            void navigator.clipboard?.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          }}
          className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-muted hover:bg-sunken hover:text-fg [&_svg]:size-4"
        >
          {copied ? <Check className="text-primary" /> : <Copy />}
        </button>
      </Tooltip>

      {open ? (
        <Tooltip content={t("site.open")}>
          <a
            href={open}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={t("site.open")}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-fg-muted hover:bg-sunken hover:text-fg [&_svg]:size-4"
          >
            <ExternalLink />
          </a>
        </Tooltip>
      ) : null}
    </div>
  );
}

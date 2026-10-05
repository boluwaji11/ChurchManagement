"use client";

import * as React from "react";
import { X } from "lucide-react";
import { IconButton } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { FIELD_MIME } from "./fields";

export interface Pill {
  key: string;
  label: string;
  /** Said under the label where the pill carries more than a field name. */
  detail?: string;
}

/**
 * R18.12. One shelf: what has been put on it, and somewhere to drop more.
 *
 * It says what it will take before anything is dragged, and it refuses what it
 * cannot use, so nobody finds out by dropping a name onto a sum.
 */
export function Shelf({
  title,
  empty,
  pills,
  takes,
  onDrop,
  onRemove,
  children,
}: {
  title: string;
  /** What to say while nothing is on it. */
  empty: string;
  pills: Pill[];
  /** Whether this shelf can use the field being dragged. */
  takes: (field: string) => boolean;
  onDrop: (field: string) => void;
  onRemove?: (key: string) => void;
  /** Anything that belongs beside the pills, such as how to aggregate. */
  children?: React.ReactNode;
}) {
  const [over, setOver] = React.useState(false);

  return (
    <section
      onDragOver={(e) => {
        const field = e.dataTransfer.types.includes(FIELD_MIME);
        if (!field) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const field = e.dataTransfer.getData(FIELD_MIME);
        if (field && takes(field)) onDrop(field);
      }}
      className={
        over
          ? "flex flex-col gap-2 rounded-[10px] border-2 border-dashed border-primary bg-primary-soft p-2.5"
          : "flex flex-col gap-2 rounded-[10px] border-2 border-dashed border-line p-2.5"
      }
    >
      <h4 className="text-caption font-semibold uppercase tracking-wide text-fg-subtle">
        {title}
      </h4>

      {pills.length === 0 ? (
        <p className="text-[13px] text-fg-subtle">{empty}</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {pills.map((one) => (
            <li
              key={one.key}
              className="flex items-center gap-1.5 rounded-full border border-line-strong bg-surface py-0.5 pl-2.5 pr-1 text-[13px] font-medium text-fg"
            >
              <span className="truncate">
                {one.label}
                {one.detail ? (
                  <span className="ml-1 font-normal text-fg-subtle">{one.detail}</span>
                ) : null}
              </span>
              {onRemove ? (
                <IconButton
                  label={t("report.removeFromShelf", { field: one.label })}
                  variant="ghost"
                  className="size-5 min-h-0 [&_svg]:size-3"
                  onClick={() => onRemove(one.key)}
                >
                  <X />
                </IconButton>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {children}
    </section>
  );
}

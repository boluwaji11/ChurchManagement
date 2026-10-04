"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@hearth/ui";
import { useChurchMark } from "./church-mark";

/**
 * R24.17. An empty state wearing this church's mark.
 *
 * The church's logo where it has one, and otherwise an icon naming the thing
 * that is missing. A drawing of a hall tells a church nothing about why their
 * screen is empty; their own mark at least tells them whose screen it is.
 */
export function Empty({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  /** What is missing, for a church that has not uploaded a logo. */
  icon: LucideIcon;
  title: string;
  body?: string;
  /** The same button this page carries in its corner. */
  action?: React.ReactNode;
  className?: string;
}) {
  const logoUrl = useChurchMark();

  return (
    <EmptyState
      mark={
        logoUrl ? (
          <img
            src={logoUrl}
            alt=""
            aria-hidden
            className="size-14 rounded-2xl border border-line bg-surface object-contain p-1.5"
          />
        ) : (
          <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Icon className="size-7" aria-hidden strokeWidth={1.5} />
          </span>
        )
      }
      title={title}
      body={body}
      action={action}
      className={className}
    />
  );
}

"use client";

import * as React from "react";
import { Users } from "lucide-react";
import { Avatar } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { when } from "@/lib/when";
import type { DraftRow, ThreadRow } from "./data";

/**
 * R16.9. The list of conversations.
 *
 * A row is a face, who it is with, what was last said, and when. An unread one
 * is set in full weight with a dot against it, which is how every inbox anybody
 * already uses marks one.
 */
export function Threads({
  rows,
  churchName,
  onOpen,
  open,
}: {
  rows: ThreadRow[];
  churchName: string;
  onOpen: (key: string, name: string) => void;
  /** Which one is being read, where the list sits beside it. */
  open?: string | null;
}) {
  return (
    <div className="flex min-w-0 flex-col">
      {rows.map((one, at) => {
        const name = one.key === "office" ? churchName : one.name;
        return (
          <button
            key={one.key}
            type="button"
            onClick={() => onOpen(one.key, name)}
            aria-current={open === one.key ? "true" : undefined}
            className={`flex min-w-0 cursor-pointer items-start gap-3 px-3.5 py-3 text-left ${
              at === 0 ? "" : "border-t border-line/70"
            } ${open === one.key ? "bg-sunken" : "hover:bg-sunken/60"}`}
          >
            {one.key === "office" ? (
              <span
                aria-hidden
                className="grid size-9 shrink-0 place-items-center rounded-full bg-sunken text-[13px] font-semibold text-fg-muted"
              >
                {churchName.slice(0, 1).toUpperCase()}
              </span>
            ) : one.key.includes("/") ? (
              /* R9.7. A whole group, which is not one face. */
              <span
                aria-hidden
                className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary [&_svg]:size-4"
              >
                <Users />
              </span>
            ) : (
              <Avatar name={name} src={one.photoUrl} id={one.memberId ?? one.key} size="md" />
            )}

            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-baseline gap-2">
                <span
                  className={`min-w-0 flex-1 truncate text-[14px] ${
                    one.unread > 0 ? "font-bold text-fg" : "font-medium text-fg"
                  }`}
                >
                  {name}
                </span>
                <span className="shrink-0 text-caption text-fg-subtle">{when(one.at)}</span>
              </span>

              <span className="flex items-center gap-2">
                <span
                  className={`min-w-0 flex-1 truncate text-caption ${
                    one.unread > 0 ? "text-fg" : "text-fg-muted"
                  }`}
                >
                  {one.lastMine ? `${t("inbox.you")}: ${one.lastLine}` : one.lastLine}
                </span>
                {one.unread > 0 ? (
                  <span aria-hidden className="size-2 shrink-0 rounded-full bg-primary" />
                ) : null}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** R16.9. What has been written and not sent. */
export function Drafts({
  rows,
  churchName,
  onOpen,
}: {
  rows: DraftRow[];
  churchName: string;
  onOpen: (key: string, name: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col">
      {rows.map((one, at) => (
        <button
          key={one.key}
          type="button"
          onClick={() => onOpen(one.key, one.key === "office" ? churchName : one.name)}
          className={`flex min-w-0 cursor-pointer items-start gap-3 px-3.5 py-3 text-left hover:bg-sunken/60 ${
            at === 0 ? "" : "border-t border-line/70"
          }`}
        >
          {one.key === "office" ? (
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-full bg-sunken text-[13px] font-semibold text-fg-muted"
            >
              {churchName.slice(0, 1).toUpperCase()}
            </span>
          ) : one.key.includes("/") ? (
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary [&_svg]:size-4"
            >
              <Users />
            </span>
          ) : (
            <Avatar name={one.name} src={one.photoUrl} id={one.key} size="md" />
          )}

          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex items-baseline gap-2">
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-fg">
                {one.key === "office" ? churchName : one.name}
              </span>
              <span className="shrink-0 text-caption text-fg-subtle">{when(one.at)}</span>
            </span>
            <span className="truncate text-caption text-fg-muted">{one.body}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

"use client";

import * as React from "react";
import { Bold, Italic, List, ListOrdered, Link2 } from "lucide-react";
import { IconButton, Textarea, cn } from "@hearth/ui";
import { t } from "@hearth/i18n";

/**
 * R9.2. A description somebody can lay out.
 *
 * Markdown rather than HTML. A group's description is written by a volunteer
 * and read by anybody, so what is stored has to be safe to put on a public page
 * without trusting whoever typed it. Markdown is text: there is no tag to
 * smuggle a script through, and the renderer only ever produces the handful of
 * elements below.
 *
 * The toolbar wraps the selection rather than replacing the box with an editor,
 * so what is typed is still what is stored and a paste out of a document does
 * not arrive carrying someone else's styling.
 */
export function RichText({
  name,
  defaultValue,
  rows = 6,
  className,
}: {
  name: string;
  defaultValue: string;
  rows?: number;
  className?: string;
}) {
  const box = React.useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = React.useState(defaultValue);

  /** Wraps what is selected, or drops the marks in and puts the caret between. */
  const wrap = (before: string, after = before) => {
    const el = box.current;
    if (!el) return;
    const { selectionStart: from, selectionEnd: to } = el;
    const picked = value.slice(from, to);
    const next = `${value.slice(0, from)}${before}${picked}${after}${value.slice(to)}`;
    setValue(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(from + before.length, from + before.length + picked.length);
    });
  };

  /** Puts a marker at the front of every selected line. */
  const prefix = (mark: (n: number) => string) => {
    const el = box.current;
    if (!el) return;
    const { selectionStart: from, selectionEnd: to } = el;
    const lineStart = value.lastIndexOf("\n", from - 1) + 1;
    const lineEnd = value.indexOf("\n", to) === -1 ? value.length : value.indexOf("\n", to);
    const block = value.slice(lineStart, lineEnd) || "";
    const marked = block
      .split("\n")
      .map((line, i) => (line.startsWith(mark(i + 1)) ? line : `${mark(i + 1)}${line}`))
      .join("\n");
    const next = value.slice(0, lineStart) + marked + value.slice(lineEnd);
    setValue(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(lineStart, lineStart + marked.length);
    });
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex flex-wrap items-center gap-0.5">
        <IconButton label={t("rich.bold")} variant="ghost" onClick={() => wrap("**")}>
          <Bold />
        </IconButton>
        <IconButton label={t("rich.italic")} variant="ghost" onClick={() => wrap("_")}>
          <Italic />
        </IconButton>
        <IconButton label={t("rich.bullets")} variant="ghost" onClick={() => prefix(() => "- ")}>
          <List />
        </IconButton>
        <IconButton
          label={t("rich.numbers")}
          variant="ghost"
          onClick={() => prefix((n) => `${n}. `)}
        >
          <ListOrdered />
        </IconButton>
        <IconButton label={t("rich.link")} variant="ghost" onClick={() => wrap("[", "](https://)")}>
          <Link2 />
        </IconButton>
      </div>

      <Textarea
        ref={box}
        name={name}
        rows={rows}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}

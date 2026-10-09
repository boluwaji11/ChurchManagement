"use client";

import * as React from "react";
import { SmilePlus } from "lucide-react";
import { t } from "@connectapp/i18n";
import { markMessage } from "@/app/messages/actions";
import type { Mark } from "./data";

/**
 * R16.9. The marks a church may put against a message.
 *
 * Six, chosen for what a church actually says back: yes, thank you, praying,
 * that made me laugh, congratulations, I am sorry. A grid of two thousand is
 * a decision nobody wants to make under a notice about the hall.
 */
export const MARKS = ["\u{1F44D}", "❤️", "\u{1F64F}", "\u{1F602}", "\u{1F389}", "\u{1F622}"];

/**
 * What has been put against one message, and the way to add one.
 *
 * The marks sit under the words rather than on them, because a reaction is an
 * answer to a line rather than part of it. Pressing one that is already yours
 * takes it off, which is what everybody's hands already expect.
 */
export function Marks({
  church,
  id,
  marks,
  mine,
  onChanged,
}: {
  church: string;
  id: string;
  marks: Mark[];
  /** Whether the reader wrote it: their own line is read rather than marked. */
  mine: boolean;
  onChanged: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const put = (emoji: string) => {
    if (busy) return;
    setBusy(true);
    setOpen(false);
    void markMessage(id, emoji, church).then(() => {
      setBusy(false);
      onChanged();
    });
  };

  if (mine) {
    /* R16.9. What others put against it, with nothing to press: a mark is an
       answer to somebody, and answering yourself is not one. */
    if (marks.length === 0) return null;
    return (
      <span className="flex flex-row-reverse items-center gap-1">
        {marks.map((one) => (
          <span
            key={one.emoji}
            className="flex min-h-6 items-center gap-1 rounded-full border border-line bg-surface px-1.5 text-[12px] leading-none text-fg-muted tabular-nums"
          >
            <span aria-hidden className="text-[14px] leading-none">{one.emoji}</span>
            {one.count > 1 ? one.count : null}
          </span>
        ))}
      </span>
    );
  }

  return (
    <div className="relative flex items-center gap-1">
      {marks.map((one) => (
        <button
          key={one.emoji}
          type="button"
          onClick={() => put(one.emoji)}
          aria-pressed={one.mine}
          className={`flex min-h-6 cursor-pointer items-center gap-1 rounded-full border px-1.5 text-[12px] leading-none tabular-nums ${
            one.mine
              ? "border-primary bg-primary-soft text-fg"
              : "border-line bg-surface text-fg-muted hover:bg-sunken"
          }`}
        >
          <span aria-hidden className="text-[14px] leading-none">{one.emoji}</span>
          {one.count > 1 ? one.count : null}
        </button>
      ))}

      {/* Shown on hover on a pointer, and always where there is no hover. */}
      <button
        type="button"
        aria-label={t("inbox.react")}
        aria-expanded={open}
        onClick={() => setOpen((was) => !was)}
        className="grid size-6 cursor-pointer place-items-center rounded-full text-fg-subtle opacity-0 transition-opacity hover:bg-sunken hover:text-fg focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100 [&_svg]:size-[14px]"
      >
        <SmilePlus aria-hidden />
      </button>

      {open ? (
        <>
          <span className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            className="absolute bottom-7 left-0 z-40 flex gap-0.5 rounded-full border border-line bg-surface p-1 shadow-lg"
          >
            {MARKS.map((one) => (
              <button
                key={one}
                type="button"
                onClick={() => put(one)}
                aria-label={one}
                className="grid size-8 cursor-pointer place-items-center rounded-full text-[19px] leading-none hover:bg-sunken"
              >
                {one}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

/**
 * R16.9. A few emoji for the box, without a two thousand character grid.
 *
 * What a church writes with: a face, a hand, a heart, and the handful of
 * things that turn up in a line about a service.
 */
const FOR_WRITING = [
  "\u{1F642}", "\u{1F605}", "\u{1F614}", "\u{1F64C}", "\u{1F44D}", "\u{1F44F}",
  "\u{1F64F}", "❤️", "\u{1F389}", "\u{1F970}", "\u{1F622}", "\u{1F62E}",
  "✅", "❗", "\u{1F4C5}", "\u{1F552}", "\u{1F4CD}", "\u{1F4DE}",
  "\u{1F3E0}", "⛪", "\u{1F3B5}", "\u{1F4D6}", "☕", "\u{1F382}",
];

/** The mark that opens them, and the grid itself. */
export function EmojiButton({ onPick }: { onPick: (emoji: string) => void }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={t("inbox.emoji")}
        aria-expanded={open}
        onClick={() => setOpen((was) => !was)}
        className="grid size-9 cursor-pointer place-items-center rounded-full text-fg-subtle hover:bg-sunken hover:text-fg [&_svg]:size-[18px]"
      >
        <SmilePlus aria-hidden />
      </button>

      {open ? (
        <>
          <span className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute bottom-11 left-0 z-40 grid w-[232px] grid-cols-6 gap-0.5 rounded-xl border border-line bg-surface p-1.5 shadow-lg">
            {FOR_WRITING.map((one) => (
              <button
                key={one}
                type="button"
                aria-label={one}
                onClick={() => { onPick(one); setOpen(false); }}
                className="grid size-9 cursor-pointer place-items-center rounded-lg text-[20px] leading-none hover:bg-sunken"
              >
                {one}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

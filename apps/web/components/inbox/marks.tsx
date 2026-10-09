"use client";

import * as React from "react";
import { SmilePlus } from "lucide-react";
import { plural, t } from "@connectapp/i18n";
import { markMessage } from "@/app/messages/actions";
import type { Mark } from "./data";

/**
 * R16.9. The marks a church may put against a message.
 *
 * Six, chosen for what a church actually says back: yes, thank you, praying,
 * that made me laugh, congratulations, I am sorry. A grid of two thousand is
 * a decision nobody wants to make under a notice about the hall.
 */
export const MARKS = [
  "\u{1F44D}", "\u2764\uFE0F", "\u{1F602}", "\u{1F389}", "\u{1F64F}", "\u{1F62E}",
];

/** R16.9. What two taps on a line puts against it. */
export const LIKE = MARKS[0]!;

/** A count that has to fit in a pill: 999, then 1.2k. */
const tally = (n: number): string =>
  n < 1000 ? String(n) : `${(n / 1000).toFixed(n < 10000 ? 1 : 0).replace(/\.0$/, "")}k`;

/** The six, with the reader's own held down so the same press takes it off. */
function Choices({
  marks,
  onPick,
  align,
}: {
  marks: Mark[];
  onPick: (emoji: string) => void;
  align: "left" | "right";
}) {
  return (
    <span
      className={`absolute bottom-7 z-40 flex gap-0.5 rounded-full border border-line bg-surface p-1 shadow-lg ${
        align === "left" ? "left-0" : "right-0"
      }`}
    >
      {MARKS.map((one) => {
        const held = marks.find((each) => each.emoji === one);
        return (
          <button
            key={one}
            type="button"
            onClick={() => onPick(one)}
            aria-label={one}
            aria-pressed={held?.mine ?? false}
            className={`emoji grid size-8 cursor-pointer place-items-center rounded-full text-[19px] hover:bg-sunken ${
              held?.mine ? "bg-primary-soft" : ""
            }`}
          >
            {one}
          </button>
        );
      })}
    </span>
  );
}

/**
 * R16.9. The way to put a mark against somebody's line.
 *
 * It rides the row of actions under the message with answering and the rest,
 * because they are the same kind of thing: what this reader may do about what
 * was said.
 */
export function ReactButton({
  church,
  id,
  marks,
  onChanged,
  className,
}: {
  church: string;
  id: string;
  marks: Mark[];
  onChanged: () => void;
  className?: string;
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

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={t("inbox.react")}
        aria-expanded={open}
        onClick={() => setOpen((was) => !was)}
        className={className}
      >
        <SmilePlus aria-hidden />
      </button>

      {open ? (
        <>
          <span className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <Choices marks={marks} onPick={put} align="left" />
        </>
      ) : null}
    </span>
  );
}

/**
 * R16.9. What has been put against one message.
 *
 * One pill holding at most two marks and the count, resting on the corner of
 * the message. A row of chips grows with every new mark and shoves the time
 * along with it, and a group of forty would fill the panel with a line of
 * faces. The pill is the shape Teams, iMessage and LinkedIn all settled on
 * for the same reason.
 *
 * It sits on the far corner from the time, so the two can never collide and
 * the time never moves.
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

  const total = marks.reduce((sum, one) => sum + one.count, 0);
  if (total === 0) return null;

  const shown = marks.slice(0, 2);
  const theirs = marks.some((one) => one.mine);

  return (
    /* Half in the message and half out of it, on the corner. The message
       keeps just enough room at its foot that the half inside lands on
       nothing. */
    <span className={`absolute -bottom-2.5 z-10 ${mine ? "left-2.5" : "right-2.5"}`}>
      <span className="relative flex items-center">
        <button
          type="button"
          disabled={mine}
          aria-label={plural("inbox.reactions", total)}
          onClick={() => setOpen((was) => !was)}
          className={`flex min-h-[20px] items-center gap-0.5 rounded-full border bg-surface px-1 shadow-sm ${
            theirs ? "border-primary" : "border-line"
          } ${mine ? "cursor-default" : "cursor-pointer hover:bg-sunken"}`}
        >
          {shown.map((one) => (
            <span key={one.emoji} aria-hidden className="emoji text-[12px]">
              {one.emoji}
            </span>
          ))}
          {total > 1 ? (
            <span className="pr-0.5 pl-px text-[10px] font-medium text-fg-muted tabular-nums">
              {tally(total)}
            </span>
          ) : null}
        </button>

        {open && !mine ? (
          <>
            <span className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <Choices marks={marks} onPick={put} align={mine ? "left" : "right"} />
          </>
        ) : null}
      </span>
    </span>
  );
}

/**
 * R16.9. A few emoji for the box, without a two thousand character grid.
 *
 * What a church writes with: a face, a hand, a heart, and the handful of
 * things that turn up in a line about a service.
 */
const FOR_WRITING = [
  "\u{1F600}", "\u{1F602}", "\u{1F972}", "\u{1F605}", "\u{1F60D}", "\u{1F929}",
  "\u{1F60E}", "\u{1F914}", "\u{1F62E}", "\u{1F642}", "\u{1F614}", "\u{1F62D}",
  "\u{1F44D}", "\u{1F44F}", "\u{1F64C}", "\u{1F64F}", "\u{1F91D}", "\u{1F4AA}",
  "\u2764\uFE0F", "\u{1F525}", "\u{1F389}", "\u{1F973}", "\u2705", "\u{1F4AF}",
  /* A church writes about its own week, so the handful of things that turn
     up in those lines are here rather than two keyboards away. */
  "\u26EA", "\u271D\uFE0F", "\u{1F54A}\uFE0F", "\u{1F3B6}", "\u2600\uFE0F", "\u2615",
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
                className="emoji grid size-9 cursor-pointer place-items-center rounded-lg text-[20px] hover:bg-sunken"
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

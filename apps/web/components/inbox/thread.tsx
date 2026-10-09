"use client";

import * as React from "react";
import { ArrowUp } from "lucide-react";
import { Avatar, Spinner, Textarea } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Markdown } from "@/components/markdown";
import { EmojiButton, LIKE, Marks } from "./marks";
import { markMessage } from "@/app/messages/actions";
import { keepDraft, send } from "@/app/messages/actions";
import type { Said } from "./data";

/**
 * R16.9. A line that is nothing but a mark or two.
 *
 * Somebody answering with a heart has not written a sentence, and a heart set
 * at reading size inside a bubble looks like a typo. Three or fewer and it is
 * drawn large, with no bubble around it, which is what every messenger does.
 */
const ONLY_MARKS = /^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|\uFE0F|\u200D|\s)+$/u;

const marksAlone = (body: string): number => {
  const words = body.trim();
  if (!words || !ONLY_MARKS.test(words)) return 0;
  const bits = typeof Intl !== "undefined" && "Segmenter" in Intl
    ? [...new Intl.Segmenter().segment(words.replace(/\s+/g, ""))].length
    : [...words.replace(/\s+/g, "")].length;
  return bits <= 3 ? bits : 0;
};

/**
 * R16.9. A conversation, laid out the way everybody already reads one.
 *
 * Theirs on the left with their face, yours on the right in the church's own
 * tint. Side carries who is speaking before a name is read, which is why every
 * messenger does it, and a church volunteer has read a thousand of these
 * already.
 *
 * The tint is soft rather than solid: a column of filled blocks at full
 * strength is a phone game, and these are lines about a hall booking.
 */
export function Conversation({
  church,
  churchName,
  to,
  said,
  onSent,
  onChanged,
  sending = false,
  draft = "",
}: {
  church: string;
  churchName: string;
  /** Who the reply goes to: "office", or whoever it is with. */
  to: string;
  said: Said[];
  onSent: () => void;
  /** R16.9. Something other than a new line changed: a mark went on or off. */
  onChanged?: () => void;
  sending?: boolean;
  /** R16.9. What was typed to this one and not sent. */
  draft?: string;
}) {
  /*
   * R16.9. It opens at the bottom, where the newest line is.
   *
   * Without a jump on the first draw a conversation opened at whatever was
   * said in August, and the thing somebody pressed it to read was below the
   * fold.
   */
  /*
   * R16.9. Two taps on somebody's line is a thumbs up, and two more takes it
   * off: the one gesture everybody already has in their hands. Double-click
   * covers a mouse; the timer covers a thumb, where there is no such event
   * on every browser.
   */
  const tapped = React.useRef<{ id: string; at: number } | null>(null);

  const like = (id: string, mine: boolean) => {
    if (mine) return;
    void markMessage(id, LIKE, church).then(() => (onChanged ?? onSent)());
  };

  const tap = (id: string, mine: boolean) => {
    const now = Date.now();
    const held = tapped.current;
    if (held && held.id === id && now - held.at < 400) {
      tapped.current = null;
      like(id, mine);
      return;
    }
    tapped.current = { id, at: now };
  };

  const foot = React.useRef<HTMLDivElement>(null);
  const was = React.useRef<string | null>(null);
  React.useEffect(() => {
    const fresh = was.current !== to;
    was.current = to;
    foot.current?.scrollIntoView({ block: "end", behavior: fresh ? "auto" : "smooth" });
  }, [to, said.length]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-4 py-3">
        {said.map((one, at) => {
          const before = said[at - 1];
          const fresh = at === 0 || before!.day !== one.day;
          /* A run of lines from the same person carries its name once. */
          const starts = fresh || !before || before.mine !== one.mine
            || before.fromOffice !== one.fromOffice;
          const name = one.fromOffice ? churchName : one.mine ? t("inbox.you") : one.name;
          const alone = marksAlone(one.body);

          return (
            <React.Fragment key={one.id}>
              {fresh ? (
                <div className="flex items-center gap-3 py-3">
                  <span aria-hidden className="h-px flex-1 bg-line" />
                  <span className="text-caption font-medium text-fg-subtle">{one.day}</span>
                  <span aria-hidden className="h-px flex-1 bg-line" />
                </div>
              ) : null}

              <div
                className={`group flex items-end gap-2 ${one.mine ? "flex-row-reverse" : ""}`}
              >
                {/* The face stays with the other side, the way every chat
                    somebody already uses draws it. Their own line needs no
                    avatar: they know who they are. */}
                <span className="w-8 shrink-0">
                  {!one.mine && starts ? (
                    one.fromOffice ? (
                      <span
                        aria-hidden
                        className="grid size-8 place-items-center rounded-full bg-sunken text-[12px] font-semibold text-fg-muted"
                      >
                        {churchName.slice(0, 1).toUpperCase()}
                      </span>
                    ) : (
                      <Avatar name={name} src={one.photoUrl} id={one.id} size="sm" />
                    )
                  ) : null}
                </span>

                <div
                  className={`flex min-w-0 max-w-[min(540px,78%)] flex-col gap-0.5 ${
                    one.mine ? "items-end" : "items-start"
                  }`}
                >
                  {starts ? (
                    <span className="px-1 text-caption font-medium text-fg-muted">{name}</span>
                  ) : null}

                  <div
                    onDoubleClick={() => like(one.id, one.mine)}
                    onPointerUp={(event) => {
                      if (event.pointerType === "mouse") return;
                      tap(one.id, one.mine);
                    }}
                    className={`relative select-none ${
                      alone
                        ? `emoji px-1 py-0.5 ${alone === 1 ? "text-[40px]" : "text-[30px]"}`
                        : `rounded-2xl px-3.5 py-2 text-[15px] leading-6 ${
                            one.mine
                              ? "rounded-br-sm bg-primary-soft text-fg"
                              : "rounded-bl-sm border border-line bg-surface text-fg"
                          } [&_p]:mb-2 [&_p:last-child]:mb-0`
                    }`}
                  >
                    {alone ? one.body.trim() : <Markdown text={one.body} />}

                    <Marks
                      church={church}
                      id={one.id}
                      marks={one.reactions}
                      mine={one.mine}
                      onChanged={onChanged ?? onSent}
                    />
                  </div>

                  {/* The time sits on its own, so nothing put against the
                      message can move it. */}
                  <span className="px-1 text-[11px] text-fg-subtle tabular-nums">
                    {one.clock}
                  </span>
                </div>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={foot} />
      </div>

      <Writer church={church} to={to} onSent={onSent} sending={sending} draft={draft} />
    </div>
  );
}

/**
 * R16.9. The box a message is written in.
 *
 * What is typed is kept while it is typed, so the half-written line survives a
 * closed laptop and turns up under Drafts rather than disappearing.
 */
export function Writer({
  church,
  to,
  onSent,
  sending = false,
  autoFocus,
  draft = "",
}: {
  church: string;
  to: string;
  onSent: () => void;
  sending?: boolean;
  autoFocus?: boolean;
  /** R16.9. What was typed to this one and not sent. */
  draft?: string;
}) {
  const [body, setBody] = React.useState(draft);
  const [working, setWorking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const busy = working || sending;

  /*
   * R16.9. What is already written down for this recipient.
   *
   * The box stays where it is while somebody moves between conversations, so
   * without this the empty box that arrived with the next one was saved over
   * whatever had been typed to them: a draft that vanished the moment it was
   * opened.
   */
  const saved = React.useRef(draft);
  /* Whether this reader has touched the box for this recipient. Once they
     have, what the server says is a draft is older news than what is in
     front of them, and must never be written back over it. */
  const touched = React.useRef(false);

  React.useEffect(() => {
    touched.current = false;
    saved.current = draft;
    setBody(draft);
    // Only the recipient changing reloads the box; see below for the draft
    // arriving a moment later.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to]);

  /* The draft often arrives a beat after the conversation opens, so it is
     taken then too, while the box is still untouched. */
  React.useEffect(() => {
    if (touched.current || draft === saved.current) return;
    saved.current = draft;
    setBody(draft);
  }, [draft]);

  /* Kept a beat behind the last keystroke, and again the moment the box goes
     away, because closing the panel used to cancel the save that had not
     fired yet. */
  const latest = React.useRef({ to, body: draft });
  latest.current = { to, body };

  /* A send in flight stops the draft being written behind it: the save that
     had been scheduled used to land after the send had thrown the draft away,
     putting the words back in the box of a message already sent. */
  const posting = React.useRef(false);

  const pending = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (body === saved.current || posting.current) return;
    pending.current = setTimeout(() => {
      saved.current = body;
      void keepDraft(to, body, church);
    }, 600);
    return () => { if (pending.current) clearTimeout(pending.current); };
  }, [body, to, church]);

  React.useEffect(() => () => {
    const held = latest.current;
    if (held.body !== saved.current) void keepDraft(held.to, held.body, church);
  }, [church]);

  const go = () => {
    const words = body.trim();
    if (!words || busy) return;
    /* The save that was already scheduled is dropped: it would land after
       the send had thrown the draft away and write it back. */
    if (pending.current) clearTimeout(pending.current);
    posting.current = true;
    setWorking(true);
    setError(null);
    void send(to, words, church).then((back) => {
      setWorking(false);
      posting.current = false;
      if (back.error) { setError(back.error); return; }
      saved.current = "";
      setBody("");
      /* Said plainly rather than left to the send: whatever was written down
         for this recipient has just been sent. */
      void keepDraft(to, "", church);
      onSent();
    });
  };

  const box = React.useRef<HTMLTextAreaElement>(null);

  /* Written where the caret is, which is where somebody looking at the box
     expects it to land. */
  const put = (emoji: string) => {
    touched.current = true;
    const at = box.current?.selectionStart ?? body.length;
    const to2 = box.current?.selectionEnd ?? at;
    setBody(`${body.slice(0, at)}${emoji}${body.slice(to2)}`);
    requestAnimationFrame(() => {
      box.current?.focus();
      box.current?.setSelectionRange(at + emoji.length, at + emoji.length);
    });
  };

  return (
    <div className="flex shrink-0 flex-col gap-1.5 border-t border-line bg-surface px-3 py-3">
      {error ? <p role="status" className="text-[13px] text-danger-text">{error}</p> : null}

      <div className="flex items-end gap-1.5">
        <EmojiButton onPick={put} />

        <Textarea
          ref={box}
          value={body}
          onChange={(event) => { touched.current = true; setBody(event.target.value); }}
          onKeyDown={(event) => {
            /* Enter sends, because that is what everybody's hands already do.
               A new line is still there on the other key. */
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              go();
            }
          }}
          aria-label={t("inbox.write")}
          rows={2}
          autoFocus={autoFocus}
          disabled={busy}
          /* A hairline rather than the field's own stronger edge: this box
             sits under a conversation rather than in a form of its own. */
          className="min-h-[44px] resize-none border-line shadow-none hover:border-line-strong"
        />

        {/* R24.6. One mark, no frame. The box beside it already says what this
            is, and a filled button with a word on it next to a text area is
            the only thing on the screen shouting. */}
        <button
          type="button"
          onClick={go}
          disabled={busy || !body.trim()}
          aria-label={t("inbox.send")}
          title={t("inbox.send")}
          className={`grid size-10 shrink-0 place-items-center rounded-full [&_svg]:size-[18px] ${
            body.trim() && !busy
              ? "cursor-pointer bg-primary text-primary-fg hover:opacity-90"
              : "cursor-default bg-sunken text-fg-subtle"
          }`}
        >
          {busy ? <Spinner /> : <ArrowUp aria-hidden />}
        </button>
      </div>
    </div>
  );
}

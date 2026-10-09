"use client";

import * as React from "react";
import { ArrowUp, Check, X } from "lucide-react";
import { Avatar, Spinner, Textarea } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Markdown } from "@/components/markdown";
import { EmojiButton, LIKE, Marks } from "./marks";
import { LineActions } from "./line-actions";
import { editLine, markMessage } from "@/app/messages/actions";
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

  /* R16.9. Which line is being answered, where one is. */
  const [answering, setAnswering] = React.useState<Said | null>(null);
  React.useEffect(() => { setAnswering(null); }, [to]);

  /** R16.9. Takes the reader to the line an answer is answering. */
  const show = (id: string) => {
    const found = document.querySelector<HTMLElement>(`[data-line="${id}"]`);
    if (!found) return;
    found.scrollIntoView({ block: "center", behavior: "smooth" });
    found.classList.add("ring-2", "ring-primary");
    setTimeout(() => found.classList.remove("ring-2", "ring-primary"), 1200);
  };

  /* R16.9. Which line is being changed, and the words as they stand. */
  const [editing, setEditing] = React.useState<string | null>(null);
  const [words, setWords] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const save = () => {
    if (!editing || !words.trim() || saving) return;
    setSaving(true);
    void editLine(editing, words, church).then(() => {
      setSaving(false);
      setEditing(null);
      (onChanged ?? onSent)();
    });
  };

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
          /* R16.9. Room at the foot of the message for what is against it, so
             the pill never sits over the words. */
          const room = one.reactions.length > 0;

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
                    data-line={one.id}
                    className={`relative scroll-mt-6 select-none ${
                      alone
                        ? `emoji px-1 pt-0.5 ${alone === 1 ? "text-[40px]" : "text-[30px]"} ${
                            room ? "pb-3" : "pb-0.5"
                          }`
                        : `rounded-2xl px-3.5 pt-2 text-[15px] leading-6 ${
                            room ? "pb-4" : "pb-2"
                          } ${
                            one.mine
                              ? "rounded-br-sm bg-primary-soft text-fg"
                              : "rounded-bl-sm border border-line bg-surface text-fg"
                          } [&_p]:mb-2 [&_p:last-child]:mb-0`
                    }`}
                  >
                    {one.answering ? (
                      /* R16.9. What this answers, above the answer, where a
                         press takes the reader back to it. */
                      <button
                        type="button"
                        onClick={() => show(one.answering!.id)}
                        className="mb-1.5 flex w-full cursor-pointer flex-col items-start gap-0.5 rounded-lg border-l-2 border-primary bg-fg/[0.04] px-2 py-1 text-left hover:bg-fg/[0.07]"
                      >
                        <span className="text-[11px] font-semibold text-fg-muted">
                          {one.answering.fromOffice ? churchName : one.answering.name}
                        </span>
                        <span className="line-clamp-2 text-[12px] text-fg-muted">
                          {one.answering.line || t("inbox.deleted")}
                        </span>
                      </button>
                    ) : null}

                    {one.deleted ? (
                      <span className="text-fg-subtle italic">{t("inbox.deleted")}</span>
                    ) : editing === one.id ? (
                      <span className="flex flex-col gap-2">
                        <Textarea
                          value={words}
                          onChange={(event) => setWords(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" && !event.shiftKey) {
                              event.preventDefault();
                              save();
                            }
                            if (event.key === "Escape") setEditing(null);
                          }}
                          rows={2}
                          autoFocus
                          aria-label={t("inbox.edit")}
                          className="min-h-[44px] resize-none border-line bg-surface shadow-none"
                        />
                        {/* R24.6. Two marks rather than two worded buttons:
                            they sit inside a message, where a pair of filled
                            buttons is the loudest thing in the thread. */}
                        <span className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setEditing(null)}
                            disabled={saving}
                            aria-label={t("action.cancel")}
                            title={t("action.cancel")}
                            className="grid size-8 cursor-pointer place-items-center rounded-full text-fg-muted hover:bg-sunken hover:text-fg [&_svg]:size-[17px]"
                          >
                            <X aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={save}
                            disabled={saving || !words.trim()}
                            aria-label={t("action.save")}
                            title={t("action.save")}
                            className={`grid size-8 place-items-center rounded-full [&_svg]:size-[17px] ${
                              words.trim() && !saving
                                ? "cursor-pointer bg-primary text-primary-fg hover:opacity-90"
                                : "cursor-default bg-sunken text-fg-subtle"
                            }`}
                          >
                            {saving ? <Spinner /> : <Check aria-hidden />}
                          </button>
                        </span>
                      </span>
                    ) : alone ? (
                      one.body.trim()
                    ) : (
                      <Markdown text={one.body} />
                    )}

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
                  <span
                    className={`flex items-center gap-1 px-1 text-[11px] text-fg-subtle tabular-nums ${
                      one.mine ? "flex-row-reverse" : ""
                    }`}
                  >
                    {/* R16.9. The marks lead and the time follows, away from
                        the corner the pill rests on, so the two never sit on
                        top of each other. */}
                    {!one.deleted && editing !== one.id ? (
                      <LineActions
                        church={church}
                        id={one.id}
                        mine={one.mine}
                        marks={one.reactions}
                        onReply={() => setAnswering(one)}
                        onEdit={() => { setEditing(one.id); setWords(one.body); }}
                        onChanged={onChanged ?? onSent}
                      />
                    ) : null}
                    {one.clock}
                    {one.edited && !one.deleted ? (
                      <span className="text-fg-subtle">{t("inbox.edited")}</span>
                    ) : null}
                  </span>
                </div>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={foot} />
      </div>

      <Writer
        church={church}
        to={to}
        onSent={onSent}
        sending={sending}
        draft={draft}
        churchName={churchName}
        answering={answering}
        onStopAnswering={() => setAnswering(null)}
      />
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
  churchName = "",
  answering = null,
  onStopAnswering,
}: {
  church: string;
  to: string;
  onSent: () => void;
  sending?: boolean;
  autoFocus?: boolean;
  /** R16.9. What was typed to this one and not sent. */
  draft?: string;
  churchName?: string;
  /** R16.9. The line this one will answer, where one was chosen. */
  answering?: Said | null;
  onStopAnswering?: () => void;
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

  /* The box going away keeps what is in it, because closing the panel used to
     cancel the save that had not fired yet. A line on its way out is not a
     draft, so a send in flight stops this too. */
  React.useEffect(() => () => {
    const held = latest.current;
    if (posting.current || held.body === saved.current) return;
    void keepDraft(held.to, held.body, church);
  }, [church]);

  const go = () => {
    const words = body.trim();
    if (!words || busy) return;

    /*
     * R16.9. The box empties on the press rather than on the answer.
     *
     * It is what every messenger does, and it closes the last way the words
     * could come back: while the send was in flight the box still held them,
     * so a save on a timer, a closing panel or an answer from the server a
     * moment out of date could all put them back. Nothing holds them now
     * except the failure path, which puts them back on purpose.
     */
    if (pending.current) clearTimeout(pending.current);
    posting.current = true;
    saved.current = "";
    latest.current = { to, body: "" };
    setBody("");
    setWorking(true);
    setError(null);

    void send(to, words, church, answering?.id ?? null).then((back) => {
      setWorking(false);
      posting.current = false;
      if (back.error) {
        /* Put them back where they were, with the reason. */
        touched.current = true;
        saved.current = "";
        setBody(words);
        setError(back.error);
        return;
      }
      /* Said plainly rather than left to the send: whatever was written down
         for this recipient has just been sent. */
      void keepDraft(to, "", church);
      onStopAnswering?.();
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

      {answering ? (
        /* R16.9. What is being answered, in front of the writer, with the way
           to stop answering it. */
        <div className="flex items-start gap-2 rounded-lg border-l-2 border-primary bg-fg/[0.04] px-2 py-1.5">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[11px] font-semibold text-fg-muted">
              {t("inbox.replyingTo", {
                name: answering.fromOffice
                  ? churchName
                  : answering.mine
                    ? t("inbox.you")
                    : answering.name,
              })}
            </span>
            <span className="line-clamp-2 text-[12px] text-fg-muted">
              {answering.body || t("inbox.deleted")}
            </span>
          </span>
          <button
            type="button"
            aria-label={t("inbox.stopReplying")}
            title={t("inbox.stopReplying")}
            onClick={onStopAnswering}
            className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-full text-fg-subtle hover:bg-sunken hover:text-fg [&_svg]:size-[14px]"
          >
            <X aria-hidden />
          </button>
        </div>
      ) : null}

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

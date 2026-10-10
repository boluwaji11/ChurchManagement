"use client";

import * as React from "react";
import {
  ArrowUp, Check, CheckCheck, Download, FileText, Paperclip, X,
} from "lucide-react";
import {
  Avatar, Button, Spinner, Textarea, Tooltip,
  Dialog, DialogContent, DialogFooter,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Markdown } from "@/components/markdown";
import { EmojiButton, LIKE, Marks } from "./marks";
import { LineActions } from "./line-actions";
import { editLine, markMessage } from "@/app/messages/actions";
import { keepDraft, send, messageFileLink } from "@/app/messages/actions";
import { UPLOAD_RULES } from "@connectapp/db/rules";
import type { Said, SentFile } from "./data";

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
/** R16.14. One file picked for a line that has not been sent yet. */
interface Carried {
  id: string;
  label: string;
  type: string;
}

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
      {/*
       * R24.11. A transcript, which is what a screen reader has a role for.
       *
       * "log" with additions announced is the one arrangement that reads a
       * line out as it arrives without reading the whole conversation again
       * every time the panel asks the server what is new.
       */}
      <div
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label={t("inbox.conversation")}
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-4 py-3"
      >
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
                    /* Selection is off only where a double tap is the
                       gesture: on a laptop it stopped somebody copying a
                       message out of the thread. */
                    className={`relative scroll-mt-6 [@media(hover:none)]:select-none ${
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
                    {one.mine && !one.deleted && editing !== one.id ? (
                      /* R16.9. On the top edge of their own message, out of
                         the way of the words and of the pill at its foot. */
                      <span
                        /* Just clear of the message: on its top edge it
                           covered the first line of a short one, and a whole
                           row higher it read as belonging to the line above. */
                        className="absolute bottom-full left-2 z-20 -mb-1.5 flex items-center gap-0.5 rounded-full border border-line bg-surface px-1 py-0.5 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100"
                      >
                        <LineActions
                          church={church}
                          id={one.id}
                          mine={one.mine}
                          marks={one.reactions}
                          onReply={() => setAnswering(one)}
                          onEdit={() => { setEditing(one.id); setWords(one.body); }}
                          onChanged={onChanged ?? onSent}
                        />
                      </span>
                    ) : null}

                    {/*
                      * R24.11. Who wrote it and when, for whoever cannot see
                      * which side of the thread it is on. The name is drawn
                      * once at the top of a run and the time sits under the
                      * message, so on screen this says nothing twice, and read
                      * aloud it is the only place either of them appears.
                      */}
                    <span className="sr-only">
                      {t("inbox.lineBy", { name, time: one.clock })}
                    </span>

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
                          <Tooltip content={t("action.cancel")}>
                            <button
                              type="button"
                              onClick={() => setEditing(null)}
                              disabled={saving}
                              aria-label={t("action.cancel")}
                              className="grid size-8 cursor-pointer place-items-center rounded-full text-fg-muted hover:bg-sunken hover:text-fg [&_svg]:size-[17px]"
                            >
                              <X aria-hidden />
                            </button>
                          </Tooltip>
                          <Tooltip content={t("action.save")}>
                            <button
                              type="button"
                              onClick={save}
                              disabled={saving || !words.trim()}
                              aria-label={t("action.save")}
                              className={`grid size-8 place-items-center rounded-full [&_svg]:size-[17px] ${
                                words.trim() && !saving
                                  ? "cursor-pointer bg-primary text-primary-fg hover:opacity-90"
                                  : "cursor-default bg-sunken text-fg-subtle"
                              }`}
                            >
                              {saving ? <Spinner /> : <Check aria-hidden />}
                            </button>
                          </Tooltip>
                        </span>
                      </span>
                    ) : alone ? (
                      one.body.trim()
                    ) : (
                      <Markdown text={one.body} />
                    )}

                    {/* R16.14. What was sent with it: a picture is shown, and
                        anything else is named and opened. */}
                    {one.files.length > 0 ? (
                      <span className="mt-1.5 flex flex-col gap-1.5">
                        {one.files.map((file) => (
                          <Sent key={file.id} church={church} file={file} />
                        ))}
                      </span>
                    ) : null}

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
                    {/* Somebody else's line carries its two marks here, where
                        there is room beside the time. Their own carries four,
                        which is a bar rather than a row, and that rides the
                        top edge of the message instead. */}
                    {!one.mine && !one.deleted ? (
                      <LineActions
                        church={church}
                        id={one.id}
                        mine={false}
                        marks={one.reactions}
                        onReply={() => setAnswering(one)}
                        onEdit={() => undefined}
                        onChanged={onChanged ?? onSent}
                        quiet
                      />
                    ) : null}
                    <span aria-hidden>{one.clock}</span>
                    {one.edited && !one.deleted ? (
                      <span className="text-fg-subtle">{t("inbox.edited")}</span>
                    ) : null}

                    {/*
                      * R16.9. One tick for landed, two for read.
                      *
                      * Nothing is sent anywhere here, so a line is in the other
                      * person's inbox the moment it is written down: the first
                      * tick says that much. The second says at least one of
                      * them has opened it, which is the thing a church actually
                      * wants to know after writing to somebody.
                      *
                      * On their own lines only. Reading a mark against
                      * somebody else's line would be reading it against
                      * yourself.
                      */}
                    {one.mine && !one.deleted ? (
                      <span
                        aria-label={one.readByOthers ? t("inbox.seen") : t("inbox.landed")}
                        className={one.readByOthers ? "text-primary" : "text-fg-subtle"}
                      >
                        {one.readByOthers
                          ? <CheckCheck className="size-[13px]" aria-hidden />
                          : <Check className="size-[13px]" aria-hidden />}
                      </span>
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

  /* R16.14. What is going with this line, uploaded as it is chosen so the
     press that sends is only ever sending. */
  const [carrying, setCarrying] = React.useState<Carried[]>([]);
  const [uploading, setUploading] = React.useState(false);

  const attach = (chosen: FileList | null) => {
    const files = [...(chosen ?? [])].slice(0, 10);
    if (files.length === 0) return;
    setError(null);
    setUploading(true);

    void Promise.all(
      files.map(async (file) => {
        const form = new FormData();
        form.set("church", church);
        form.set("purpose", "message");
        form.set("file", file);
        const answer = await fetch("/api/upload", { method: "POST", body: form });
        const back = (await answer.json()) as { id?: string; error?: string };
        if (!answer.ok || !back.id) throw new Error(back.error ?? t("inbox.failed"));
        return { id: back.id, label: file.name, type: file.type };
      }),
    )
      .then((added) => setCarrying((was) => [...was, ...added].slice(0, 10)))
      .catch((bad: Error) => setError(bad.message))
      .finally(() => setUploading(false));
  };

  const go = () => {
    const words = body.trim();
    if ((!words && carrying.length === 0) || busy || uploading) return;

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

    const going = carrying;
    setCarrying([]);

    void send(
      to,
      words,
      church,
      answering?.id ?? null,
      going.map((one) => ({ id: one.id, label: one.label })),
    ).then((back) => {
      setWorking(false);
      posting.current = false;
      if (back.error) {
        /* Put them back where they were, with the reason. */
        touched.current = true;
        saved.current = "";
        setBody(words);
        setCarrying(going);
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
  const picker = React.useRef<HTMLInputElement>(null);

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
          <Tooltip content={t("inbox.stopReplying")}>
            <button
              type="button"
              aria-label={t("inbox.stopReplying")}
              onClick={onStopAnswering}
              className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-full text-fg-subtle hover:bg-sunken hover:text-fg [&_svg]:size-[14px]"
            >
              <X aria-hidden />
            </button>
          </Tooltip>
        </div>
      ) : null}

      {/* R16.14. What is going with this line, read before it goes. */}
      {carrying.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {carrying.map((one) => (
            <li
              key={one.id}
              className="flex max-w-full items-center gap-1 rounded-full bg-sunken px-2 py-0.5 text-[12px] text-fg-muted"
            >
              <Paperclip className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{one.label}</span>
              <button
                type="button"
                aria-label={t("inbox.dontSend", { name: one.label })}
                onClick={() => setCarrying((was) => was.filter((each) => each.id !== one.id))}
                className="grid size-5 shrink-0 cursor-pointer place-items-center rounded-full text-fg-subtle hover:bg-line hover:text-fg [&_svg]:size-3"
              >
                <X aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex items-end gap-1.5">
        <EmojiButton onPick={put} />

        {/* R16.14. Sending a photograph or a document with the line. */}
        <input
          ref={picker}
          type="file"
          multiple
          className="sr-only"
          accept={UPLOAD_RULES.message.types.join(",")}
          onChange={(event) => {
            attach(event.target.files);
            event.target.value = "";
          }}
        />
        <Tooltip content={t("inbox.attach")}>
          <button
            type="button"
            onClick={() => picker.current?.click()}
            disabled={busy || uploading}
            aria-label={t("inbox.attach")}
            className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-fg-muted hover:bg-sunken hover:text-fg disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-[18px]"
          >
            {uploading ? <Spinner /> : <Paperclip aria-hidden />}
          </button>
        </Tooltip>

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
        <Tooltip content={t("inbox.send")}>
          <button
            type="button"
            onClick={go}
            disabled={busy || uploading || (!body.trim() && carrying.length === 0)}
            aria-label={t("inbox.send")}
            className={`grid size-10 shrink-0 place-items-center rounded-full [&_svg]:size-[18px] ${
              (body.trim() || carrying.length > 0) && !busy && !uploading
                ? "cursor-pointer bg-primary text-primary-fg hover:opacity-90"
                : "cursor-default bg-sunken text-fg-subtle"
            }`}
          >
            {busy ? <Spinner /> : <ArrowUp aria-hidden />}
          </button>
        </Tooltip>
      </div>
    </div>
  );
}

/**
 * R16.14. One file on a line.
 *
 * The link is asked for when it is pressed rather than put in the page: a
 * conversation of forty lines would otherwise sign forty URLs nobody opens,
 * each one good for an hour.
 */
function Sent({
  church,
  file,
}: {
  church: string;
  file: SentFile;
}) {
  const [opening, setOpening] = React.useState(false);
  const [shown, setShown] = React.useState<string | null>(null);
  const [big, setBig] = React.useState(false);
  const picture = file.contentType.startsWith("image/");

  /* A picture is the message, so it is fetched and shown. Anything else waits
     to be asked for. */
  React.useEffect(() => {
    if (!picture) return;
    let live = true;
    void messageFileLink(file.key, church).then((url) => {
      if (live) setShown(url);
    });
    return () => { live = false; };
  }, [picture, file.key, church]);

  /** R16.14. Keeping a copy, under the name it was sent with. */
  const save = () => {
    setOpening(true);
    void messageFileLink(file.key, church, file.label)
      .then((url) => {
        if (url) window.open(url, "_blank", "noopener");
      })
      .finally(() => setOpening(false));
  };

  if (picture) {
    return (
      <>
        {/* R16.14. A picture opens where it is, big enough to read. Keeping
            a copy is a press inside that, rather than what looking at it
            does. */}
        <button
          type="button"
          onClick={() => setBig(true)}
          aria-label={file.label}
          className="block max-w-[260px] cursor-zoom-in overflow-hidden rounded-lg"
        >
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt={file.label} className="h-auto w-full object-cover" />
          ) : (
            <span className="flex h-24 w-[200px] items-center justify-center bg-fg/[0.06]">
              <Spinner />
            </span>
          )}
        </button>

        <Dialog open={big} onOpenChange={setBig}>
          {/* The picture is the thing. Its name is kept for a screen reader
              rather than written across the top of it. */}
          <DialogContent hideTitle title={file.label} closeLabel={t("common.close")}>
            {shown ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shown}
                alt={file.label}
                className="mx-auto max-h-[70vh] w-auto max-w-full rounded-lg"
              />
            ) : null}

            <DialogFooter>
              <Button type="button" variant="secondary" loading={opening} onClick={save}>
                <Download /> {t("inbox.keepCopy")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <button
      type="button"
      onClick={save}
      disabled={opening}
      /* The same ground on either side of the conversation: a pale chip on
         the writer's own lavender bubble had white words on it. */
      className="flex max-w-full cursor-pointer items-center gap-1.5 rounded-lg bg-fg/[0.08] px-2 py-1.5 text-[12px] text-fg"
    >
      {opening ? <Spinner /> : <FileText className="size-4 shrink-0" aria-hidden />}
      <span className="truncate underline underline-offset-2">{file.label}</span>
    </button>
  );
}

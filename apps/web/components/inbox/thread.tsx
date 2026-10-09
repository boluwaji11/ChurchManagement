"use client";

import * as React from "react";
import { ArrowUp } from "lucide-react";
import { Avatar, Spinner, Textarea } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Markdown } from "@/components/markdown";
import { keepDraft, send } from "@/app/messages/actions";
import type { Said } from "./data";

/**
 * R16.9. A conversation, read the way a conversation is read.
 *
 * Each message is a block with who wrote it, when, and the words: the shape
 * every mail client and every support inbox has settled on, because it stays
 * legible when a line runs to five sentences and it does not depend on colour
 * to say who is speaking. Two columns of coloured bubbles is a phone chat,
 * and this is a church writing to somebody about a hall booking.
 */
export function Conversation({
  church,
  churchName,
  to,
  said,
  onSent,
  sending = false,
}: {
  church: string;
  churchName: string;
  /** Who the reply goes to: "office", or whoever it is with. */
  to: string;
  said: Said[];
  onSent: () => void;
  sending?: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {said.map((one, at) => {
          const fresh = at === 0 || said[at - 1]!.day !== one.day;
          const name = one.fromOffice ? churchName : one.mine ? t("inbox.you") : one.name;

          return (
            <React.Fragment key={one.id}>
              {fresh ? (
                <div className="flex items-center gap-3 px-4 py-3">
                  <span aria-hidden className="h-px flex-1 bg-line" />
                  <span className="text-caption font-medium text-fg-subtle">{one.day}</span>
                  <span aria-hidden className="h-px flex-1 bg-line" />
                </div>
              ) : null}

              <article className="flex gap-3 border-b border-line/70 px-4 py-3.5 last:border-0">
                {one.fromOffice ? (
                  <span
                    aria-hidden
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-sunken text-[13px] font-semibold text-fg-muted"
                  >
                    {churchName.slice(0, 1).toUpperCase()}
                  </span>
                ) : (
                  <Avatar name={name} src={one.photoUrl} id={one.id} size="md" />
                )}

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex items-baseline gap-2">
                    <span className="text-[14px] font-semibold text-fg">{name}</span>
                    <span className="text-caption text-fg-subtle tabular-nums">{one.clock}</span>
                  </span>
                  <div className="text-[15px] leading-6 text-fg [&_p]:mb-2 [&_p:last-child]:mb-0">
                    <Markdown text={one.body} />
                  </div>
                </div>
              </article>
            </React.Fragment>
          );
        })}
      </div>

      <Writer church={church} to={to} onSent={onSent} sending={sending} />
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
  placeholder,
  autoFocus,
}: {
  church: string;
  to: string;
  onSent: () => void;
  sending?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [body, setBody] = React.useState("");
  const [working, setWorking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const busy = working || sending;

  /* Kept a beat behind the last keystroke, the way every other box in this
     product that saves itself is. */
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) { first.current = false; return; }
    const timer = setTimeout(() => { void keepDraft(to, body, church); }, 900);
    return () => clearTimeout(timer);
  }, [body, to, church]);

  const go = () => {
    const words = body.trim();
    if (!words || busy) return;
    setWorking(true);
    setError(null);
    void send(to, words, church).then((back) => {
      setWorking(false);
      if (back.error) { setError(back.error); return; }
      setBody("");
      first.current = true;
      onSent();
    });
  };

  return (
    <div className="flex shrink-0 flex-col gap-1.5 border-t border-line bg-surface px-3 py-3">
      {error ? <p role="status" className="text-[13px] text-danger-text">{error}</p> : null}

      <div className="flex items-end gap-2">
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            /* Enter sends, because that is what everybody's hands already do.
               A new line is still there on the other key. */
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              go();
            }
          }}
          placeholder={placeholder ?? t("inbox.writePlaceholder")}
          aria-label={t("inbox.write")}
          rows={2}
          autoFocus={autoFocus}
          disabled={busy}
          className="min-h-[44px] resize-none"
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

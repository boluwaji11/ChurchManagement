"use client";

import * as React from "react";
import { ArrowUp } from "lucide-react";
import { Avatar, Spinner, Textarea } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Markdown } from "@/components/markdown";
import { keepDraft, send } from "@/app/messages/actions";
import type { Said } from "./data";

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
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-4 py-3">
        {said.map((one, at) => {
          const before = said[at - 1];
          const fresh = at === 0 || before!.day !== one.day;
          /* A run of lines from the same person carries its name once. */
          const starts = fresh || !before || before.mine !== one.mine
            || before.fromOffice !== one.fromOffice;
          const name = one.fromOffice ? churchName : one.mine ? t("inbox.you") : one.name;

          return (
            <React.Fragment key={one.id}>
              {fresh ? (
                <div className="flex items-center gap-3 py-3">
                  <span aria-hidden className="h-px flex-1 bg-line" />
                  <span className="text-caption font-medium text-fg-subtle">{one.day}</span>
                  <span aria-hidden className="h-px flex-1 bg-line" />
                </div>
              ) : null}

              <div className={`flex items-end gap-2 ${one.mine ? "flex-row-reverse" : ""}`}>
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
                    className={`rounded-2xl px-3.5 py-2 text-[15px] leading-6 ${
                      one.mine
                        ? "rounded-br-sm bg-primary-soft text-fg"
                        : "rounded-bl-sm border border-line bg-surface text-fg"
                    } [&_p]:mb-2 [&_p:last-child]:mb-0`}
                  >
                    <Markdown text={one.body} />
                  </div>

                  <span className="px-1 text-[11px] text-fg-subtle tabular-nums">
                    {one.clock}
                  </span>
                </div>
              </div>
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

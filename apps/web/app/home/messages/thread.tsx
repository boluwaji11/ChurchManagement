"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button, Textarea } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Markdown } from "@/components/markdown";
import { writeToChurch } from "./actions";

export interface Said {
  id: string;
  side: "member" | "church";
  body: string;
  /** Already written the way this church writes a time. */
  when: string;
  /** The day it was said, for the mark that breaks the thread up. */
  day: string;
}

/**
 * R16.9, R17.1. A member's conversation with their church.
 *
 * Drawn as one thread down a rail rather than as two columns of bubbles: a
 * member opens this three times a year, and what they need is to see the whole
 * exchange in order with the church's side marked. The church is on the left
 * against the canvas and the member's own words sit in the church's colour, so
 * the two are told apart before a word is read.
 */
export function Thread({
  church,
  churchName,
  said,
}: {
  church: string;
  churchName: string;
  said: Said[];
}) {
  const router = useRouter();
  const [body, setBody] = React.useState("");
  const [working, setWorking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [redrawing, startRedraw] = React.useTransition();
  const busy = working || redrawing;
  const foot = React.useRef<HTMLDivElement>(null);

  // The newest line is the one somebody came to read.
  React.useEffect(() => {
    foot.current?.scrollIntoView({ block: "end" });
  }, [said.length]);

  const send = () => {
    if (!body.trim() || busy) return;
    setWorking(true);
    setError(null);
    void writeToChurch(body, church).then((back) => {
      setWorking(false);
      if (back.error) {
        setError(back.error);
        return;
      }
      setBody("");
      startRedraw(() => router.refresh());
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col">
        {said.map((one, at) => {
          const fresh = at === 0 || said[at - 1]!.day !== one.day;
          const mine = one.side === "member";

          return (
            <React.Fragment key={one.id}>
              {fresh ? (
                <div className="flex items-center gap-3 py-3">
                  <span aria-hidden className="h-px flex-1 bg-line" />
                  <span className="text-caption font-medium text-fg-subtle">{one.day}</span>
                  <span aria-hidden className="h-px flex-1 bg-line" />
                </div>
              ) : null}

              <div className={`flex gap-3 ${mine ? "flex-row-reverse" : ""}`}>
                {/* The rail. It runs through the gap between two lines, so the
                    thread reads as one sequence rather than as loose cards. */}
                <span className="flex w-9 shrink-0 flex-col items-center">
                  <span
                    aria-hidden
                    className={`grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-semibold ${
                      mine
                        ? "bg-primary text-[var(--on-primary)]"
                        : "bg-primary-soft text-primary"
                    }`}
                  >
                    {mine ? t("inbox.you") : churchName.slice(0, 1).toUpperCase()}
                  </span>
                  {at === said.length - 1 ? null : (
                    <span aria-hidden className="w-px flex-1 bg-line" />
                  )}
                </span>

                <div className={`flex min-w-0 max-w-[min(560px,82%)] flex-col gap-1 pb-4 ${mine ? "items-end" : ""}`}>
                  <span className="flex items-baseline gap-2 text-caption text-fg-subtle">
                    <span className="font-medium text-fg-muted">
                      {mine ? t("inbox.you") : churchName}
                    </span>
                    {one.when}
                  </span>

                  <div
                    className={`rounded-2xl px-4 py-2.5 text-[15px] leading-6 ${
                      mine
                        ? "rounded-tr-sm bg-primary text-[var(--on-primary)] [&_a]:text-[var(--on-primary)]"
                        : "rounded-tl-sm border border-line bg-surface text-fg"
                    }`}
                  >
                    <Markdown text={one.body} />
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={foot} />
      </div>

      {error ? <p role="status" className="text-[13px] text-danger-text">{error}</p> : null}

      <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-3">
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={t("inbox.writePlaceholder")}
          aria-label={t("inbox.write")}
          rows={3}
          disabled={busy}
        />
        <div className="flex justify-end">
          <Button loading={busy} disabled={busy || !body.trim()} onClick={send}>
            <Send /> {t("inbox.send")}
          </Button>
        </div>
      </div>
    </div>
  );
}

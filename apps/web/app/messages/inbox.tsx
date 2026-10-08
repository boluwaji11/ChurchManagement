"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, MessageSquare, Send } from "lucide-react";
import {
  Avatar, Button, EmptyState, IconButton, Textarea, Tooltip,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Markdown } from "@/components/markdown";
import { SearchField } from "@/components/search-field";
import { archiveThread, replyToMember } from "./actions";

export interface ThreadRow {
  id: string;
  memberId: string;
  name: string;
  photoUrl: string | null;
  lastLine: string;
  when: string;
  unread: number;
}

export interface Said {
  id: string;
  side: "member" | "church";
  body: string;
  when: string;
  day: string;
}

/**
 * R16.9. The office's inbox.
 *
 * Threads down the left, the one being answered beside it, because somebody
 * clearing ten of these in a sitting should never leave the screen. A thread
 * with something unread carries the count and its name in full weight, which
 * is the only thing on the list drawn in the church's own colour.
 */
export function Inbox({
  church,
  threads,
  open,
  said,
  putAway,
  archivedCount,
}: {
  church: string;
  threads: ThreadRow[];
  open: ThreadRow | null;
  said: Said[];
  putAway: boolean;
  archivedCount: number;
}) {
  const router = useRouter();
  const [find, setFind] = React.useState("");
  const [body, setBody] = React.useState("");
  const [working, setWorking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [redrawing, startRedraw] = React.useTransition();
  const busy = working || redrawing;
  const foot = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    foot.current?.scrollIntoView({ block: "end" });
  }, [said.length, open?.id]);

  React.useEffect(() => { setBody(""); }, [open?.id]);

  const shown = React.useMemo(() => {
    const want = find.trim().toLowerCase();
    return want
      ? threads.filter((one) => one.name.toLowerCase().includes(want))
      : threads;
  }, [threads, find]);

  const send = () => {
    if (!open || !body.trim() || busy) return;
    setWorking(true);
    setError(null);
    void replyToMember(open.memberId, body, church).then((back) => {
      setWorking(false);
      if (back.error) {
        setError(back.error);
        return;
      }
      setBody("");
      startRedraw(() => router.refresh());
    });
  };

  const put = (id: string, away: boolean) => {
    setWorking(true);
    void archiveThread(id, away, church).then((back) => {
      setWorking(false);
      if (back.error) {
        setError(back.error);
        return;
      }
      startRedraw(() => router.push(`/messages?church=${church}${away ? "" : "&archived=1"}`));
    });
  };

  const where = (id: string) =>
    `/messages?church=${church}${putAway ? "&archived=1" : ""}&id=${id}`;

  return (
    <div className="flex flex-col gap-4">
      {error ? <p role="status" className="text-[13px] text-danger-text">{error}</p> : null}

      <div className="grid min-h-[60vh] gap-4 lg:[grid-template-columns:minmax(260px,340px)_1fr]">
        {/* The list. */}
        <div className="flex min-w-0 flex-col gap-3">
          {threads.length > 0 ? (
            <SearchField value={find} onChange={setFind} placeholder={t("inbox.find")} />
          ) : null}

          <div className="flex min-w-0 flex-col overflow-hidden rounded-[14px] border border-line bg-surface">
            {shown.length === 0 ? (
              <p className="px-4 py-6 text-[13px] text-fg-muted">
                {putAway ? t("inbox.archived.none") : t("inbox.noThreads")}
              </p>
            ) : null}

            {shown.map((one, at) => (
              <Link
                key={one.id}
                href={where(one.id)}
                aria-current={open?.id === one.id ? "true" : undefined}
                className={`flex min-w-0 items-start gap-3 px-3.5 py-3 transition-colors ${
                  at === 0 ? "" : "border-t border-line"
                } ${open?.id === one.id ? "bg-primary-soft" : "hover:bg-sunken"}`}
              >
                <Avatar name={one.name} src={one.photoUrl} id={one.memberId} size="md" />

                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-baseline gap-2">
                    <span
                      className={`min-w-0 flex-1 truncate text-[14px] ${
                        one.unread > 0 ? "font-bold text-fg" : "font-medium text-fg"
                      }`}
                    >
                      {one.name}
                    </span>
                    <span className="shrink-0 text-caption text-fg-subtle tabular-nums">
                      {one.when}
                    </span>
                  </span>

                  <span className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-caption text-fg-muted">
                      {one.lastLine}
                    </span>
                    {one.unread > 0 ? (
                      <span className="grid min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-[var(--on-primary)] tabular-nums">
                        {one.unread}
                      </span>
                    ) : null}
                  </span>
                </span>
              </Link>
            ))}
          </div>

          {!putAway && archivedCount > 0 ? (
            <Link
              href={`/messages?church=${church}&archived=1`}
              className="self-start text-label font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("inbox.archived.title")}
            </Link>
          ) : null}
        </div>

        {/* The one being answered. */}
        <div className="flex min-w-0 flex-col overflow-hidden rounded-[14px] border border-line bg-surface">
          {open ? (
            <>
              <header className="flex items-center gap-3 border-b border-line px-4 py-3">
                <Avatar name={open.name} src={open.photoUrl} id={open.memberId} size="md" />
                <Link
                  href={`/members/${open.memberId}?church=${church}`}
                  className="min-w-0 flex-1 truncate font-semibold text-fg hover:underline"
                >
                  {open.name}
                </Link>
                <Tooltip content={putAway ? t("inbox.restore") : t("inbox.archiveDo")}>
                  <span>
                    <IconButton
                      label={putAway ? t("inbox.restore") : t("inbox.archiveDo")}
                      variant="ghost"
                      disabled={busy}
                      className="size-9 min-h-0 [&_svg]:size-4"
                      onClick={() => put(open.id, !putAway)}
                    >
                      {putAway ? <ArchiveRestore /> : <Archive />}
                    </IconButton>
                  </span>
                </Tooltip>
              </header>

              <div className="flex flex-1 flex-col gap-0 overflow-y-auto px-4 py-4 [max-height:56vh]">
                {said.map((one, at) => {
                  const fresh = at === 0 || said[at - 1]!.day !== one.day;
                  const ours = one.side === "church";

                  return (
                    <React.Fragment key={one.id}>
                      {fresh ? (
                        <div className="flex items-center gap-3 py-3">
                          <span aria-hidden className="h-px flex-1 bg-line" />
                          <span className="text-caption font-medium text-fg-subtle">{one.day}</span>
                          <span aria-hidden className="h-px flex-1 bg-line" />
                        </div>
                      ) : null}

                      <div className={`flex gap-3 ${ours ? "flex-row-reverse" : ""}`}>
                        <span className="flex w-9 shrink-0 flex-col items-center">
                          {ours ? (
                            <span
                              aria-hidden
                              className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-[var(--on-primary)] [&_svg]:size-4"
                            >
                              <MessageSquare />
                            </span>
                          ) : (
                            <Avatar
                              name={open.name}
                              src={open.photoUrl}
                              id={open.memberId}
                              size="md"
                            />
                          )}
                          {at === said.length - 1 ? null : (
                            <span aria-hidden className="w-px flex-1 bg-line" />
                          )}
                        </span>

                        <div
                          className={`flex min-w-0 max-w-[min(560px,82%)] flex-col gap-1 pb-4 ${
                            ours ? "items-end" : ""
                          }`}
                        >
                          <span className="flex items-baseline gap-2 text-caption text-fg-subtle">
                            <span className="font-medium text-fg-muted">
                              {ours ? t("inbox.church") : open.name}
                            </span>
                            {one.when}
                          </span>

                          <div
                            className={`rounded-2xl px-4 py-2.5 text-[15px] leading-6 ${
                              ours
                                ? "rounded-tr-sm bg-primary text-[var(--on-primary)] [&_a]:text-[var(--on-primary)]"
                                : "rounded-tl-sm border border-line bg-canvas text-fg"
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

              <div className="flex flex-col gap-2 border-t border-line p-3">
                <Textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder={t("inbox.replyPlaceholder")}
                  aria-label={t("inbox.reply")}
                  rows={3}
                  disabled={busy}
                />
                <div className="flex justify-end">
                  <Button loading={busy} disabled={busy || !body.trim()} onClick={send}>
                    <Send /> {t("inbox.send")}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              mark={
                <span
                  aria-hidden
                  className="grid size-12 place-items-center rounded-[14px] bg-primary-soft text-primary"
                >
                  <MessageSquare className="size-5" />
                </span>
              }
              title={threads.length === 0 ? t("inbox.noThreads") : t("inbox.pickOne")}
            />
          )}
        </div>
      </div>
    </div>
  );
}

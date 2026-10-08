"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Archive, MessageSquare, PenSquare } from "lucide-react";
import { Avatar, IconButton } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Empty } from "@/components/empty";
import { archiveThread, readThread } from "@/app/messages/actions";
import { useInbox } from "./data";
import { Drafts, Threads } from "./list";
import { Conversation } from "./thread";
import { Compose } from "./compose";

type View = "inbox" | "sent" | "drafts";

/**
 * R16.9. Messages, from wherever somebody is.
 *
 * In the bar beside the bell, because a message is the same kind of thing as a
 * notification: something waiting, that is read where it is noticed rather
 * than on a screen somebody has to go and find. Pressing it opens the whole
 * inbox: what came in, what went out, what was started and not sent, and the
 * way to write a new one.
 */
export function InboxMark({
  church,
  churchName,
  office,
  full,
}: {
  church: string;
  churchName: string;
  /** Whether this reader answers for the church. */
  office: boolean;
  /** The whole screen, for the link at the foot of the panel. */
  full: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState<View>("inbox");
  const [key, setKey] = React.useState<string | null>(null);
  const [writing, setWriting] = React.useState(false);
  const [to, setTo] = React.useState("");

  const { data, refresh } = useInbox(church, { view, key, watching: open });

  const go = (next: string) => {
    setWriting(false);
    setKey(next);
    void readThread(next, church).then(refresh);
  };

  const back = () => { setKey(null); setWriting(false); };

  const TABS: { key: View; label: string }[] = [
    { key: "inbox", label: t("inbox.tab.inbox") },
    { key: "sent", label: t("inbox.tab.sent") },
    { key: "drafts", label: t("inbox.tab.drafts") },
  ];

  const title = key
    ? (data.open?.key === "office" ? churchName : data.open?.name ?? "")
    : writing
      ? t("inbox.new")
      : t("inbox.title");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-label={t("inbox.title")}
        aria-expanded={open}
        className="relative grid size-9 cursor-pointer place-items-center rounded-md border border-line-strong bg-surface hover:bg-sunken"
      >
        <MessageSquare className="size-[17px]" aria-hidden />
        {data.unread > 0 ? (
          <span className="absolute -top-[5px] -right-[5px] grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger px-[5px] text-[11px] font-semibold text-white">
            {data.unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-11 right-0 z-50 flex h-[min(560px,calc(100vh-120px))] w-[min(420px,calc(100vw-32px))] flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
            <header className="flex items-center gap-2 border-b border-line px-3 py-2.5">
              {key || writing ? (
                <IconButton
                  label={t("inbox.back")}
                  variant="ghost"
                  className="size-8 min-h-0 [&_svg]:size-4"
                  onClick={back}
                >
                  <ArrowLeft />
                </IconButton>
              ) : null}

              {key && data.open && data.open.key !== "office" ? (
                <Avatar
                  name={data.open.name}
                  src={data.open.photoUrl}
                  id={data.open.memberId ?? data.open.key}
                  size="sm"
                />
              ) : null}

              <span className="min-w-0 flex-1 truncate font-semibold text-fg">{title}</span>

              {key && office ? (
                <IconButton
                  label={data.open?.archived ? t("inbox.restore") : t("inbox.archiveDo")}
                  variant="ghost"
                  className="size-8 min-h-0 [&_svg]:size-4"
                  onClick={() => {
                    void archiveThread(key, !data.open?.archived, church).then(() => {
                      back();
                      refresh();
                    });
                  }}
                >
                  <Archive />
                </IconButton>
              ) : null}

              {!key && !writing ? (
                <IconButton
                  label={t("inbox.new")}
                  variant="ghost"
                  className="size-8 min-h-0 [&_svg]:size-4"
                  onClick={() => { setTo(office ? "" : "office"); setWriting(true); }}
                >
                  <PenSquare />
                </IconButton>
              ) : null}
            </header>

            {!key && !writing ? (
              <nav className="flex gap-1 border-b border-line px-2 py-1.5">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setView(tab.key)}
                    aria-current={view === tab.key ? "true" : undefined}
                    className={`min-h-8 cursor-pointer rounded-full px-3 text-[13px] font-medium ${
                      view === tab.key
                        ? "bg-sunken text-fg"
                        : "text-fg-muted hover:text-fg"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            ) : null}

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              {key ? (
                <Conversation
                  church={church}
                  churchName={churchName}
                  to={key}
                  said={data.said}
                  onSent={refresh}
                />
              ) : writing ? (
                <Compose
                  church={church}
                  churchName={churchName}
                  lookup={office}
                  to={to}
                  onTo={setTo}
                  onSent={(next) => { setWriting(false); go(next); }}
                />
              ) : view === "drafts" ? (
                data.drafts.length === 0 ? (
                  <Empty icon="inbox" title={t("inbox.noDrafts")} className="gap-3 px-4 py-10" />
                ) : (
                  <Drafts rows={data.drafts} churchName={churchName} onOpen={go} />
                )
              ) : data.threads.length === 0 ? (
                <Empty
                  icon="inbox"
                  title={view === "sent" ? t("inbox.noneSent") : t("inbox.noThreads")}
                  className="gap-3 px-4 py-10"
                />
              ) : (
                <Threads rows={data.threads} churchName={churchName} onOpen={go} />
              )}
            </div>

            <Link
              href={full}
              onClick={() => setOpen(false)}
              className="border-t border-line px-4 py-2.5 text-center text-[13px] font-medium text-primary hover:bg-sunken"
            >
              {t("inbox.openAll")}
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}

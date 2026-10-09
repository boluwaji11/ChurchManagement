"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Archive, MessageSquare, PenSquare, Users } from "lucide-react";
import { Avatar, IconButton } from "@connectapp/ui";
import { t, plural } from "@connectapp/i18n";
import { Empty } from "@/components/empty";
import { archiveThread } from "@/app/messages/actions";
import { EMPTY, useInbox } from "./data";
import { Drafts, Threads } from "./list";
import { Conversation } from "./thread";
import { Compose } from "./compose";
import { OPEN_INBOX, type OpenInbox } from "./write-to";

type View = "inbox" | "drafts";

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
  place = "bar",
  clear = "none",
  unread = 0,
}: {
  church: string;
  churchName: string;
  /** Whether this reader answers for the church. */
  office: boolean;
  /** The whole screen, for the link at the foot of the panel. */
  full: string;
  /**
   * R17.1. Where it sits.
   *
   * In the bar beside the bell on the screens staff work in all week, and in
   * the corner of the portal, which is where a member's thumb already is and
   * where every product that lets somebody write in has put it.
   */
  place?: "bar" | "float";
  /** What the shell already counted, so the mark is right on first paint. */
  unread?: number;
  /**
   * What else is already in that corner.
   *
   * The tab bar a phone carries on the staff screens, and the setup path that
   * follows a new church around until it is finished.
   */
  clear?: "none" | "tabs" | "dock";
}) {
  const [open, setOpen] = React.useState(false);
  const launcher = React.useRef<HTMLButtonElement>(null);
  const panel = React.useRef<HTMLDivElement>(null);
  const [view, setView] = React.useState<View>("inbox");
  const [key, setKey] = React.useState<string | null>(null);
  const [writing, setWriting] = React.useState(false);
  const [to, setTo] = React.useState("");

  const { data, refresh } = useInbox(church, {
    view,
    key,
    watching: open,
    /* Looking at it is reading it, line by line as they arrive. */
    reading: open && Boolean(key),
    initial: { ...EMPTY, unread },
  });

  /*
   * R16.9. The conversation that was pressed, held while its lines are on
   * their way, so the panel names it rather than going blank.
   */
  const [opening, setOpening] = React.useState<{ key: string; name: string } | null>(null);

  const go = (next: string, name?: string) => {
    setWriting(false);
    setOpening({ key: next, name: name ?? "" });
    setKey(next);
  };

  const back = () => { setKey(null); setWriting(false); };

  /*
   * R16.9. A record's own press opens this panel on that conversation.
   *
   * The press is on a member's page, a group's or a team's, which are server
   * screens with no handle on the launcher. They raise an event and the
   * launcher answers it, so the errand happens where the reader already is.
   */
  React.useEffect(() => {
    const open = (event: Event) => {
      const { at, name } = (event as CustomEvent<OpenInbox>).detail;
      setOpen(true);
      setWriting(false);
      setOpening({ key: at, name: name ?? "" });
      setKey(at);
    };
    window.addEventListener(OPEN_INBOX, open);
    return () => window.removeEventListener(OPEN_INBOX, open);
  }, []);

  const TABS: { key: View; label: string }[] = [
    { key: "inbox", label: t("inbox.tab.inbox") },
    { key: "drafts", label: t("inbox.tab.drafts") },
  ];

  const here = data.open?.key === key ? data.open : null;
  const title = key
    ? (key === "office" ? churchName : here?.name || opening?.name || "")
    : writing
      ? t("inbox.new")
      : t("inbox.title");

  const floating = place === "float";

  /*
   * R24.11. Escape closes it, and the focus goes back to the mark that opened
   * it. A panel that can only be dismissed by clicking the page behind it is a
   * panel somebody on a keyboard is stuck inside.
   */
  const shut = React.useCallback(() => {
    setOpen(false);
    setKey(null);
    setWriting(false);
    launcher.current?.focus();
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") shut();
    };
    window.addEventListener("keydown", key);
    /* The focus goes into the panel on the press, so the next Tab is a
       conversation rather than whatever sits after the mark on the page. */
    panel.current?.focus();
    return () => window.removeEventListener("keydown", key);
  }, [open, shut]);

  /* R24.6. It moves when something lands in it, and then it stops. */
  const [nudging, setNudging] = React.useState(false);
  const seen = React.useRef(data.unread);
  React.useEffect(() => {
    if (data.unread > seen.current) {
      setNudging(true);
      const timer = setTimeout(() => setNudging(false), 1400);
      seen.current = data.unread;
      return () => clearTimeout(timer);
    }
    seen.current = data.unread;
  }, [data.unread]);

  return (
    <div
      className={floating
        /* Clear of the home indicator on a phone, of the tab bar above it,
           and of the setup path while a church is still walking it. */
        ? `fixed right-[max(1rem,env(safe-area-inset-right))] z-40 ${
            clear === "dock"
              ? "bottom-[calc(10rem+env(safe-area-inset-bottom))] sm:bottom-[13.5rem]"
              : clear === "tabs"
                ? "bottom-[calc(5.5rem+env(safe-area-inset-bottom))] sm:bottom-[calc(1rem+env(safe-area-inset-bottom))]"
                : "bottom-[calc(1rem+env(safe-area-inset-bottom))]"
          }`
        : "relative"}
    >
      <button
        type="button"
        ref={launcher}
        onClick={() => setOpen((was) => !was)}
        /* R24.11. The count is drawn on the mark, so the name carries it for
           whoever is not looking at it. */
        aria-label={data.unread > 0 ? plural("inbox.unread", data.unread) : t("inbox.title")}
        aria-expanded={open}
        className={floating
          ? "relative grid size-14 cursor-pointer place-items-center rounded-full bg-primary text-primary-fg shadow-lg transition-transform duration-[var(--duration-fast)] hover:scale-105 active:scale-95"
          : "relative grid size-9 cursor-pointer place-items-center rounded-md border border-line-strong bg-surface hover:bg-sunken"}
        style={
          nudging && floating
            ? { animation: "connectapp-nudge 700ms var(--ease-out) 2" }
            : undefined
        }
      >
        <MessageSquare className={floating ? "size-6" : "size-[17px]"} aria-hidden />
        {data.unread > 0 ? (
          /* On the round launcher the count sits on the circle's own edge,
             with a ring in the page's colour so it reads as a count rather
             than as a blob stuck to the side of it. */
          <span
            className={floating
              ? "absolute -top-0.5 -right-0.5 grid h-[22px] min-w-[22px] place-items-center rounded-full bg-danger px-1.5 text-[12px] font-semibold leading-none text-white ring-2 ring-[var(--canvas)] tabular-nums"
              : "absolute -top-[5px] -right-[5px] grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger px-[5px] text-[11px] font-semibold leading-none text-white tabular-nums"}
          >
            {data.unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <div aria-hidden className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            ref={panel}
            tabIndex={-1}
            role="dialog"
            aria-label={t("inbox.title")}
            className={`absolute right-0 z-50 flex h-[min(560px,calc(100vh-120px))] w-[min(420px,calc(100vw-32px))] flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-lg ${
              floating ? "bottom-[68px]" : "top-11"
            }`}
          >
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

              {key && key.includes("/") ? (
                <span
                  aria-hidden
                  className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-primary [&_svg]:size-4"
                >
                  <Users />
                </span>
              ) : key && key !== "office" ? (
                <Avatar
                  name={here?.name || opening?.name || ""}
                  src={here?.photoUrl ?? null}
                  id={key}
                  size="sm"
                />
              ) : null}

              <span className="min-w-0 flex-1 truncate font-semibold text-fg">{title}</span>

              {key && office ? (
                <IconButton
                  label={here?.archived ? t("inbox.restore") : t("inbox.archiveDo")}
                  variant="ghost"
                  className="size-8 min-h-0 [&_svg]:size-4"
                  onClick={() => {
                    void archiveThread(key, !here?.archived, church).then(() => {
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
              <nav className="flex gap-1 border-b border-line bg-canvas px-2 py-2">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setView(tab.key)}
                    aria-current={view === tab.key ? "true" : undefined}
                    className={`min-h-8 cursor-pointer rounded-full px-3.5 text-[13px] font-medium transition-colors ${
                      view === tab.key
                        ? "bg-primary text-primary-fg"
                        : "text-fg-muted hover:bg-sunken hover:text-fg"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            ) : null}

            {/* A conversation does its own scrolling, so the panel does not
                scroll it as well: two scrolling boxes inside each other is why
                opening one landed halfway up it. */}
            <div
              className={`flex min-h-0 flex-1 flex-col ${
                key ? "overflow-hidden" : "overflow-y-auto"
              }`}
            >
              {key ? (
                <Conversation
                  church={church}
                  churchName={churchName}
                  to={key}
                  said={here ? data.said : []}
                  draft={data.drafts.find((one) => one.key === key)?.body ?? ""}
                  onSent={refresh}
                  onChanged={refresh}
                />
              ) : writing ? (
                <Compose
                  church={church}
                  churchName={churchName}
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
                  title={t("inbox.noThreads")}
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

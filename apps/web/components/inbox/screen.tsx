"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Archive, ArchiveRestore, PenSquare, Users } from "lucide-react";
import { Avatar, IconButton } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Empty } from "@/components/empty";
import { SearchField } from "@/components/search-field";
import { archiveThread } from "@/app/messages/actions";
import { useInbox, type InboxData } from "./data";
import { Drafts, Threads } from "./list";
import { Conversation } from "./thread";
import { Compose } from "./compose";

type View = "inbox" | "sent" | "drafts";

/**
 * R16.9. The whole inbox, on a screen of its own.
 *
 * The same three pieces the panel is made of, given room: the conversations
 * down the left and the one being read beside them, so somebody answering ten
 * of these in a sitting never leaves the screen.
 *
 * Which conversation is open is in the address, and the address is who it is
 * with rather than which row holds it.
 */
export function InboxScreen({
  church,
  churchName,
  office,
  where,
  open,
  initial,
}: {
  church: string;
  churchName: string;
  office: boolean;
  /** Where this screen lives, for the addresses it writes. */
  where: string;
  /** Which conversation the address names. */
  open: string | null;
  /** What the server already knew, so the screen never paints empty. */
  initial: InboxData;
}) {
  const router = useRouter();
  const [view, setView] = React.useState<View>("inbox");
  const [find, setFind] = React.useState("");
  const [writing, setWriting] = React.useState(false);
  const [to, setTo] = React.useState("");

  const { data, refresh } = useInbox(church, {
    view,
    key: open,
    watching: true,
    reading: Boolean(open),
    // Only the view the server rendered starts filled; the others arrive on
    // their first ask, which is what pressing them is.
    initial: view === "inbox" ? initial : undefined,
  });

  /*
   * R16.9. What this pane knows about the open conversation: the answer that
   * names it, or the row in the list, which is already on screen. A header
   * that empties while the lines travel reads as a broken screen.
   */
  const here = data.open?.key === open ? data.open : null;
  const row = data.threads.find((one) => one.key === open) ?? null;
  const name = open === "office"
    ? churchName
    : here?.name || row?.name || "";

  const go = (key: string) => {
    setWriting(false);
    router.push(`${where}/${key}?church=${church}`);
  };

  const shown = React.useMemo(() => {
    const want = find.trim().toLowerCase();
    const rows = data.threads;
    return want ? rows.filter((one) => one.name.toLowerCase().includes(want)) : rows;
  }, [data.threads, find]);

  const TABS: { key: View; label: string }[] = [
    { key: "inbox", label: t("inbox.tab.inbox") },
    { key: "sent", label: t("inbox.tab.sent") },
    { key: "drafts", label: t("inbox.tab.drafts") },
  ];

  return (
    <div className="grid min-h-[70vh] gap-4 lg:[grid-template-columns:minmax(280px,360px)_1fr]">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex items-center gap-2">
          <SearchField value={find} onChange={setFind} placeholder={t("inbox.find")} />
          <IconButton
            label={t("inbox.new")}
            variant="secondary"
            className="size-10 min-h-0 shrink-0 [&_svg]:size-[18px]"
            onClick={() => { setTo(office ? "" : "office"); setWriting(true); }}
          >
            <PenSquare />
          </IconButton>
        </div>

        {/* R24.6. A segmented control: the one in use is filled, so which
            list this is can be read without comparing three greys. */}
        <nav className="flex w-fit gap-1 rounded-full border border-line bg-sunken p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setView(tab.key)}
              aria-current={view === tab.key ? "true" : undefined}
              className={`min-h-8 cursor-pointer rounded-full px-3.5 text-[13px] font-medium transition-colors ${
                view === tab.key
                  ? "bg-primary text-primary-fg"
                  : "text-fg-muted hover:text-fg"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex min-w-0 flex-col overflow-hidden rounded-[14px] border border-line bg-surface">
          {view === "drafts" ? (
            data.drafts.length === 0 ? (
              <p className="px-4 py-6 text-[13px] text-fg-muted">{t("inbox.noDrafts")}</p>
            ) : (
              <Drafts rows={data.drafts} churchName={churchName} onOpen={go} />
            )
          ) : shown.length === 0 ? (
            <p className="px-4 py-6 text-[13px] text-fg-muted">
              {view === "sent" ? t("inbox.noneSent") : t("inbox.noThreads")}
            </p>
          ) : (
            <Threads rows={shown} churchName={churchName} onOpen={go} open={open} />
          )}
        </div>
      </div>

      <div className="flex min-h-[60vh] min-w-0 flex-col overflow-hidden rounded-[14px] border border-line bg-surface">
        {writing ? (
          <>
            <header className="flex items-center gap-3 border-b border-line px-4 py-3">
              <span className="min-w-0 flex-1 truncate font-semibold text-fg">
                {t("inbox.new")}
              </span>
            </header>
            <Compose
              church={church}
              churchName={churchName}
              lookup={office}
              to={to}
              onTo={setTo}
              onSent={(key) => go(key)}
            />
          </>
        ) : open ? (
          <>
            <header className="flex items-center gap-3 border-b border-line px-4 py-3">
              {open === "office" ? (
                <span
                  aria-hidden
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-sunken text-[13px] font-semibold text-fg-muted"
                >
                  {churchName.slice(0, 1).toUpperCase()}
                </span>
              ) : open.includes("/") ? (
                <span
                  aria-hidden
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary [&_svg]:size-[18px]"
                >
                  <Users />
                </span>
              ) : (
                <Avatar
                  name={name}
                  src={here?.photoUrl ?? row?.photoUrl ?? null}
                  id={open}
                  size="md"
                />
              )}

              {office && open !== "office" && !open.includes("/") ? (
                <Link
                  href={`/members/${open}?church=${church}`}
                  className="min-w-0 flex-1 truncate font-semibold text-fg hover:underline"
                >
                  {name}
                </Link>
              ) : (
                <span className="min-w-0 flex-1 truncate font-semibold text-fg">{name}</span>
              )}

              {office ? (
                <IconButton
                  label={here?.archived ? t("inbox.restore") : t("inbox.archiveDo")}
                  variant="ghost"
                  className="size-9 min-h-0 [&_svg]:size-4"
                  onClick={() => {
                    void archiveThread(open, !here?.archived, church).then(() => {
                      router.push(`${where}?church=${church}`);
                      refresh();
                    });
                  }}
                >
                  {here?.archived ? <ArchiveRestore /> : <Archive />}
                </IconButton>
              ) : null}
            </header>

            <Conversation
              church={church}
              churchName={churchName}
              to={open}
              said={here ? data.said : []}
              draft={data.drafts.find((one) => one.key === open)?.body ?? ""}
              onSent={refresh}
            />
          </>
        ) : (
          <Empty
            icon="inbox"
            title={data.threads.length === 0 ? t("inbox.noThreads") : t("inbox.pickOne")}
            className="my-auto gap-3 px-4 py-10"
          />
        )}
      </div>
    </div>
  );
}

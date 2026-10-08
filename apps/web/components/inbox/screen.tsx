"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Archive, ArchiveRestore, PenSquare } from "lucide-react";
import { Avatar, Button, IconButton } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Empty } from "@/components/empty";
import { SearchField } from "@/components/search-field";
import { archiveThread, readThread } from "@/app/messages/actions";
import { useInbox } from "./data";
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
  here,
  open,
}: {
  church: string;
  churchName: string;
  office: boolean;
  /** Where this screen lives, for the addresses it writes. */
  here: string;
  /** Which conversation the address names. */
  open: string | null;
}) {
  const router = useRouter();
  const [view, setView] = React.useState<View>("inbox");
  const [find, setFind] = React.useState("");
  const [writing, setWriting] = React.useState(false);
  const [to, setTo] = React.useState("");

  const { data, refresh } = useInbox(church, { view, key: open, watching: true });

  React.useEffect(() => {
    if (open) void readThread(open, church).then(refresh);
    // The address is the only thing that opens one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, church]);

  const go = (key: string) => {
    setWriting(false);
    router.push(`${here}/${key}?church=${church}`);
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
          <Button
            variant="secondary"
            onClick={() => { setTo(office ? "" : "office"); setWriting(true); }}
          >
            <PenSquare /> {t("inbox.new")}
          </Button>
        </div>

        <nav className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setView(tab.key)}
              aria-current={view === tab.key ? "true" : undefined}
              className={`min-h-8 cursor-pointer rounded-full px-3 text-[13px] font-medium ${
                view === tab.key ? "bg-sunken text-fg" : "text-fg-muted hover:text-fg"
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
        ) : open && data.open ? (
          <>
            <header className="flex items-center gap-3 border-b border-line px-4 py-3">
              {data.open.key === "office" ? (
                <span
                  aria-hidden
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-sunken text-[13px] font-semibold text-fg-muted"
                >
                  {churchName.slice(0, 1).toUpperCase()}
                </span>
              ) : (
                <Avatar
                  name={data.open.name}
                  src={data.open.photoUrl}
                  id={data.open.memberId ?? data.open.key}
                  size="md"
                />
              )}

              {office && data.open.key !== "office" ? (
                <Link
                  href={`/members/${data.open.key}?church=${church}`}
                  className="min-w-0 flex-1 truncate font-semibold text-fg hover:underline"
                >
                  {data.open.name}
                </Link>
              ) : (
                <span className="min-w-0 flex-1 truncate font-semibold text-fg">
                  {data.open.key === "office" ? churchName : data.open.name}
                </span>
              )}

              {office ? (
                <IconButton
                  label={data.open.archived ? t("inbox.restore") : t("inbox.archiveDo")}
                  variant="ghost"
                  className="size-9 min-h-0 [&_svg]:size-4"
                  onClick={() => {
                    void archiveThread(open, !data.open!.archived, church).then(() => {
                      router.push(`${here}?church=${church}`);
                      refresh();
                    });
                  }}
                >
                  {data.open.archived ? <ArchiveRestore /> : <Archive />}
                </IconButton>
              ) : null}
            </header>

            <Conversation
              church={church}
              churchName={churchName}
              to={open}
              said={data.said}
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

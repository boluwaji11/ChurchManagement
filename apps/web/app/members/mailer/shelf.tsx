"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArchiveRestore, FileText, Plus } from "lucide-react";
import {
  Button, EmptyState, Field, IconButton, Input, Sheet, SheetContent,
} from "@connectapp/ui";
import { plural, t } from "@connectapp/i18n";
import { SearchField } from "@/components/search-field";
import { archiveMailer, startMailer } from "./actions";

export interface MailerCard {
  id: string;
  slug: string;
  name: string;
  /** When it was last written to, already in the church's own format. */
  when: string;
}

/** Above this many, the shelf is read by typing rather than by looking. */
const SEARCHABLE = 5;

/**
 * R16.12. The mailers a church has on the go.
 *
 * A letter to a congregation is written across a week, so the screen opens on
 * what is already being written rather than on an empty box. Starting a new
 * one asks for its name and nothing else, the way a report does.
 */
export function Shelf({
  church,
  mailers,
  putAway = false,
  archivedCount = 0,
}: {
  church: string;
  mailers: MailerCard[];
  /** R24.6. Whether this is the list of the ones put away. */
  putAway?: boolean;
  /** How many are put away, for the link that reaches them. */
  archivedCount?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [find, setFind] = React.useState("");
  const [working, setWorking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [going, startGoing] = React.useTransition();
  const busy = working || going;

  const shown = React.useMemo(() => {
    const want = find.trim().toLowerCase();
    return want ? mailers.filter((one) => one.name.toLowerCase().includes(want)) : mailers;
  }, [mailers, find]);

  const go = () => {
    if (!name.trim() || busy) return;
    setWorking(true);
    setError(null);
    void startMailer(name, church).then((back) => {
      if (back.error) {
        setWorking(false);
        setError(back.error);
        return;
      }
      startGoing(() => {
        router.push(`/members/mailer?church=${church}&open=${back.slug}`);
        setOpen(false);
      });
    });
  };

  const start = (
    <Button
      loading={busy}
      onClick={() => { setName(""); setError(null); setOpen(true); }}
    >
      <Plus /> {t("post.new")}
    </Button>
  );

  return (
    <div className="flex flex-col gap-4">
      {mailers.length > 0 && !putAway ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {mailers.length > SEARCHABLE ? (
            <SearchField value={find} onChange={setFind} placeholder={t("post.find")} />
          ) : (
            <span />
          )}
          {start}
        </div>
      ) : null}

      {error && !open ?  (
        <p role="status" className="text-[13px] text-danger-text">{error}</p>
      ) : null}

      {mailers.length === 0 && putAway ? (
        <p className="text-fg-muted">{t("post.archived.none")}</p>
      ) : mailers.length === 0 ? (
        <EmptyState
          mark={
            <span
              aria-hidden
              className="grid size-12 place-items-center rounded-[14px]"
              style={{ background: "var(--hue-indigo-tint)", color: "var(--hue-indigo-key)" }}
            >
              <FileText className="size-5" />
            </span>
          }
          title={t("post.noneYet")}
          action={start}
        />
      ) : (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(280px,100%),1fr))]">
          {shown.map((one) => (
            <div
              key={one.id}
              className="relative flex items-start gap-3 rounded-[14px] border border-line bg-surface p-5 transition-colors hover:bg-sunken"
            >
              <span
                aria-hidden
                className="grid size-9 shrink-0 place-items-center rounded-lg"
                style={{ background: "var(--hue-indigo-tint)", color: "var(--hue-indigo-key)" }}
              >
                <FileText className="size-4" />
              </span>

              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                {/* Stretched, so the whole tile opens it. */}
                <Link
                  href={`/members/mailer?church=${church}&open=${one.slug}`}
                  className="font-semibold text-fg after:absolute after:inset-0 after:content-['']"
                >
                  {one.name}
                </Link>
                <span className="text-caption text-fg-muted">
                  {t("post.savedAt", { when: one.when })}
                </span>
              </span>

              {putAway ? (
                <span className="relative z-10 shrink-0">
                  <IconButton
                    label={t("post.restore")}
                    variant="ghost"
                    disabled={busy}
                    className="size-8 min-h-0 [&_svg]:size-4"
                    onClick={() => {
                      setWorking(true);
                      void archiveMailer(one.id, false, church).then((back) => {
                        setWorking(false);
                        if (back.error) {
                          setError(back.error);
                          return;
                        }
                        startGoing(() => router.refresh());
                      });
                    }}
                  >
                    <ArchiveRestore />
                  </IconButton>
                </span>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {shown.length === 0 && mailers.length > 0 ? (
        <p className="text-[13px] text-fg-muted">{t("lists.noneFound")}</p>
      ) : null}

      {!putAway && archivedCount > 0 ? (
        <Link
          href={`/members/mailer?church=${church}&archived=1`}
          className="self-start text-label font-medium text-primary underline-offset-4 hover:underline"
        >
          {plural("post.archived", archivedCount)}
        </Link>
      ) : null}

      <Sheet open={open} onOpenChange={(next) => { if (!busy) setOpen(next); }}>
        <SheetContent
          title={t("post.new")}
          closeLabel={t("action.cancel")}
          footer={
            <>
              <Button variant="secondary" disabled={busy} onClick={() => setOpen(false)}>
                {t("action.cancel")}
              </Button>
              <Button loading={busy} disabled={busy || !name.trim()} onClick={go}>
                {t("report.start")}
              </Button>
            </>
          }
        >
          <div
            aria-busy={busy}
            className={busy ? "pointer-events-none opacity-60" : undefined}
          >
            <Field label={t("post.name")} required error={error ?? undefined}>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") { event.preventDefault(); go(); }
                }}
                placeholder={t("post.namePlaceholder")}
                autoFocus
              />
            </Field>
          </div>
        </SheetContent>
      </Sheet>

    </div>
  );
}

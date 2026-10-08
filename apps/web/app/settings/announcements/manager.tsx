"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Archive, Megaphone, Pin, Plus, Undo2 } from "lucide-react";
import {
  Banner, Button, Field, HueDot, HUES, IconButton, Input, Switch, Textarea,
  DatePicker, Sheet, SheetContent, SheetTrigger, type Hue,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { DATE_LABELS } from "@/lib/date-labels";
import { Empty } from "@/components/empty";
import { Confirm } from "@/components/confirm";
import { usePanelGuard } from "@/components/panel-guard";
import { saveAnnouncement, archiveAnnouncement } from "./actions";

export interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  hue: string;
  pinned: boolean;
  /** Written on the server, in the church's own way of writing a date. */
  published: string | null;
  expires: string | null;
  expiresOn: string | null;
  /** Past its day, so members no longer see it. */
  gone: boolean;
  archived: boolean;
}

/**
 * R16.11. What a church tells everybody, and the one screen it writes from.
 *
 * Nothing here sends anything. It is written, it is published, and members
 * read it in their own portal. A church holds no credentials for this and
 * nothing is queued.
 */
export function Announcements({
  church,
  rows,
  putAway,
}: {
  church: string;
  rows: AnnouncementRow[];
  /** R24.6. Whether this is the shelf of ones taken off the board. */
  putAway?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, start] = React.useTransition();

  const run = (work: () => Promise<{ error?: string }>) =>
    start(async () => {
      const result = await work();
      setError(result.error);
      if (!result.error) router.refresh();
    });

  if (rows.length === 0) {
    return (
      <Empty
        icon="inbox"
        title={putAway ? t("announce.archived.none") : t("announce.none")}
        action={putAway ? undefined : <Writer church={church} pending={pending} />}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("announce.failed")}>{error}</Banner> : null}

      {putAway ? null : (
        <div className="flex justify-end">
          <Writer church={church} pending={pending} />
        </div>
      )}

      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {rows.map((one) => (
          <li
            key={one.id}
            className="flex min-w-0 gap-3.5 rounded-[14px] border border-line bg-surface p-4"
          >
            <span
              aria-hidden
              className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-[10px] [&_svg]:size-[18px]"
              style={{
                background: `var(--hue-${one.hue}-tint)`,
                color: `var(--hue-${one.hue}-key)`,
              }}
            >
              <Megaphone />
            </span>

            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 font-semibold text-fg">{one.title}</span>
                {one.pinned ? <Mark icon={<Pin />} text={t("announce.pinnedMark")} /> : null}
                {one.published ? null : <Mark text={t("announce.draftMark")} />}
                {one.gone ? <Mark text={t("announce.expired")} /> : null}
              </span>

              <span className="whitespace-pre-wrap text-[length:var(--d-text-body)] text-fg-muted">
                {one.body}
              </span>

              {one.published || one.expires ? (
                <span className="text-caption text-fg-subtle">
                  {[one.published, one.expires].filter(Boolean).join(" · ")}
                </span>
              ) : null}
            </span>

            <span className="flex shrink-0 items-start gap-1">
              {putAway ? (
                <IconButton
                  label={t("announce.restore")}
                  variant="ghost"
                  disabled={pending}
                  onClick={() => run(() => archiveAnnouncement(one.id, false, church))}
                >
                  <Undo2 />
                </IconButton>
              ) : (
                <>
                  <Writer
                    church={church}
                    pending={pending}
                    row={one}
                    trigger={
                      <IconButton label={t("announce.editTitle")} variant="ghost" disabled={pending}>
                        <Megaphone />
                      </IconButton>
                    }
                  />
                  <Confirm
                    title={t("announce.archiveTitle", { title: one.title })}
                    body={t("announce.archiveBody")}
                    confirmLabel={t("announce.archive")}
                    disabled={pending}
                    onConfirm={() => archiveAnnouncement(one.id, true, church).then((back) => {
                      setError(back.error);
                      router.refresh();
                    })}
                    trigger={
                      <IconButton label={t("announce.archive")} variant="ghost" disabled={pending}>
                        <Archive />
                      </IconButton>
                    }
                  />
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A word about where an announcement stands, in the shape a badge takes. */
function Mark({ icon, text }: { icon?: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sunken px-2 py-0.5 text-caption font-medium text-fg-muted [&_svg]:size-3">
      {icon}
      {text}
    </span>
  );
}

/** R16.11. Writing one, or changing one, in the panel from the right. */
function Writer({
  church,
  pending,
  row,
  trigger,
}: {
  church: string;
  pending: boolean;
  row?: AnnouncementRow;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [saving, start] = React.useTransition();
  const [dirty, setDirty] = React.useState(false);
  const [error, setError] = React.useState<string>();

  const [title, setTitle] = React.useState(row?.title ?? "");
  const [body, setBody] = React.useState(row?.body ?? "");
  const [hue, setHue] = React.useState<Hue>((row?.hue as Hue) ?? HUES[0]);
  const [pinned, setPinned] = React.useState(row?.pinned ?? false);
  const [expires, setExpires] = React.useState(row?.expiresOn ?? "");

  React.useEffect(() => {
    if (!open) return;
    setTitle(row?.title ?? "");
    setBody(row?.body ?? "");
    setHue((row?.hue as Hue) ?? HUES[0]);
    setPinned(row?.pinned ?? false);
    setExpires(row?.expiresOn ?? "");
    setDirty(false);
    setError(undefined);
  }, [open, row]);

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) setDirty(false);
  };
  const { onOpenChange, guard } = usePanelGuard({ dirty, setOpen: close });

  /** R16.11. Published on the way out, or kept back to finish later. */
  const send = (publish: boolean) => {
    const data = new FormData();
    data.set("church", church);
    if (row) data.set("id", row.id);
    data.set("title", title);
    data.set("body", body);
    data.set("hue", hue);
    if (pinned) data.set("pinned", "on");
    if (expires) data.set("expiresOn", expires);
    if (publish) data.set("publish", "yes");

    start(async () => {
      const result = await saveAnnouncement(data);
      if (result.error) {
        setError(result.error);
        return;
      }
      close(false);
      router.refresh();
    });
  };

  const ready = Boolean(title.trim() && body.trim());

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button disabled={pending}>
            <Plus /> {t("announce.add")}
          </Button>
        )}
      </SheetTrigger>

      <SheetContent
        title={row ? t("announce.editTitle") : t("announce.newTitle")}
        closeLabel={t("common.close")}
        footer={
          <>
            {/* A draft is only worth offering while it is not already out. */}
            {row?.published ? null : (
              <Button
                variant="secondary"
                disabled={!ready || saving}
                onClick={() => send(false)}
              >
                {t("announce.draft")}
              </Button>
            )}
            <Button loading={saving} disabled={!ready} onClick={() => send(true)}>
              {row?.published ? t("action.save") : t("announce.publish")}
            </Button>
          </>
        }
      >
        {guard}

        <div className="flex flex-col gap-4" onInput={() => setDirty(true)}>
          {error ? <Banner tone="danger" title={t("announce.failed")}>{error}</Banner> : null}

          <Field label={t("announce.heading")} required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </Field>

          <Field label={t("announce.body")} required>
            <Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>

          {/* R24.4. A hue does work here: it is the mark on the feed, so two
              announcements in the same week are told apart at a glance. */}
          <div className="flex flex-col gap-1.5">
            <span className="text-label text-fg">{t("announce.colour")}</span>
            <div className="flex flex-wrap gap-1.5">
              {HUES.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-label={t(`hue.${option}` as never)}
                  aria-pressed={hue === option}
                  onClick={() => { setHue(option); setDirty(true); }}
                  className={
                    hue === option
                      ? "cursor-pointer rounded-full p-1 ring-2 ring-primary"
                      : "cursor-pointer rounded-full p-1 ring-2 ring-transparent hover:ring-line-strong"
                  }
                >
                  <HueDot hue={option} />
                </button>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-center justify-between gap-3">
            <span className="text-label text-fg">{t("announce.pinned")}</span>
            <Switch
              checked={pinned}
              onCheckedChange={(next) => { setPinned(next); setDirty(true); }}
            />
          </label>

          <Field label={t("announce.expires")}>
            <DatePicker
              value={expires}
              onChange={(next) => { setExpires(next ?? ""); setDirty(true); }}
              labels={DATE_LABELS()}
            />
          </Field>
        </div>
      </SheetContent>
    </Sheet>
  );
}

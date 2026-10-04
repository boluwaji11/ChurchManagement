"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Trash2, GripVertical, Pencil, MessageSquare, X, Paperclip,
  Copy, LayoutList,
} from "lucide-react";
import {
  Banner, Button, Field, IconButton, Input, Separator, Textarea, cn,
  Dialog, DialogTrigger, DialogContent, DialogFooter,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import type { ItemKind, ShapeItem } from "@hearth/db";
import {
  saveItem, dropItem, reorder, saveNote, dropNote, dropFile, fileLink,
  keepAsTemplate, renamePlanTemplate, dropTemplate, useTemplate, copyFrom, shapeOf,
} from "./actions";

const KINDS: ItemKind[] = [
  "song", "scripture", "sermon", "prayer", "offering", "announcement", "media", "custom",
];

export interface OrderItem {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  minutes: number;
  notes: OrderNote[];
  files: OrderFile[];
}

export interface OrderFile {
  id: string;
  key: string;
  label: string | null;
  contentType: string;
}

export interface OrderNote {
  id: string;
  body: string;
  audience: string | null;
}

/** R11.8. A saved shape, and a plan already run, both offered as a start. */
export interface OrderTemplate {
  id: string;
  name: string;
  items: number;
  minutes: number;
}

export interface OrderSource {
  occurrenceId: string;
  label: string;
  items: number;
  minutes: number;
}

/** HH:MM from minutes past midnight, wrapping so a late plan reads. */
const toTime = (minutes: number): string => {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  const at = new Date();
  at.setHours(Math.floor(wrapped / 60), wrapped % 60, 0, 0);
  return at
    .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true })
    .toLowerCase();
};

const fromTime = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/**
 * R11.2, R11.3. The order of service, with the clock running down it.
 *
 * The start time of every item and the time the plan ends are worked out here
 * rather than fetched, so lengthening the sermon by five minutes moves the
 * whole afternoon as the number is typed.
 */
/** R24.4. A hue a kind, so a song reads as a song down the whole plan. */
const KIND_HUE: Record<string, string> = {
  song: "violet",
  scripture: "sky",
  sermon: "indigo",
  prayer: "teal",
  offering: "amber",
  announcement: "citron",
  media: "rose",
  custom: "clay",
};

export function Order({
  church,
  occurrenceId,
  planId,
  serviceStartsAt,
  series,
  theme,
  items,
  templates,
  sources,
}: {
  church: string;
  occurrenceId: string;
  planId: string;
  serviceStartsAt: string;
  series: string | null;
  theme: string | null;
  items: OrderItem[];
  templates: OrderTemplate[];
  sources: OrderSource[];
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const start = fromTime(serviceStartsAt);
  let at = start;
  const timed = items.map((item) => {
    const row = { ...item, startsAt: at };
    at += item.minutes;
    return row;
  });

  const [dragging, setDragging] = React.useState<string | null>(null);
  /** The row the pointer is over, and which side of it the item would land. */
  const [over, setOver] = React.useState<{ id: string; after: boolean } | null>(null);

  /**
   * R11.2. Dragging an item to where it should be.
   *
   * The line is drawn above or below the row under the pointer depending on
   * which half it is over, so what lands is what was shown. The whole order
   * goes in one write, so a card moved five rows is one change and the plan is
   * never half reordered.
   */
  const dropHere = () => {
    const id = dragging;
    const target = over;
    setDragging(null);
    setOver(null);
    if (!id || !target || target.id === id) return;

    const order = items.map((one) => one.id);
    const from = order.indexOf(id);
    if (from === -1) return;

    order.splice(from, 1);
    const at = order.indexOf(target.id);
    if (at === -1) return;

    order.splice(target.after ? at + 1 : at, 0, id);
    if (order.every((one, i) => one === items[i]?.id)) return;
    run(() => reorder(planId, order, church));
  };

  const run = (work: () => Promise<{ error?: string }>) => {
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      if (!result.error) router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-6" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("order.failed")}>{error}</Banner> : null}

      <section className="overflow-hidden rounded-lg border border-line bg-surface">
        {timed.length === 0 ? (
          /* A plain line rather than an illustration: the row under it is the
             thing to press, and a picture between them only pushes it down. */
          <p className="px-4 py-6 text-center text-fg-muted">{t("order.empty")}</p>
        ) : (
          <ul className="flex flex-col">
            {timed.map((item, i) => {
              const hue = KIND_HUE[item.kind] ?? "clay";

              return (
                <li
                  key={item.id}
                  draggable
                  onDragStart={(e) => {
                    setDragging(item.id);
                    e.dataTransfer.effectAllowed = "move";
                    // Firefox starts no drag at all without something on it.
                    e.dataTransfer.setData("text/plain", item.id);
                  }}
                  onDragEnd={() => {
                    setDragging(null);
                    setOver(null);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    const box = e.currentTarget.getBoundingClientRect();
                    const after = e.clientY > box.top + box.height / 2;
                    setOver((was) =>
                      was?.id === item.id && was.after === after ? was : { id: item.id, after },
                    );
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    dropHere();
                  }}
                  className={cn(
                    "flex flex-col border-b border-sunken last:border-0",
                    dragging === item.id && "opacity-40",
                    over?.id === item.id && !over.after && "shadow-[inset_0_2px_0_0_var(--color-primary)]",
                    over?.id === item.id && over.after && "shadow-[inset_0_-2px_0_0_var(--color-primary)]",
                  )}
                >
                  <div className="flex flex-nowrap items-center gap-2.5 px-4 py-3">
                    <GripVertical
                      className="size-4 shrink-0 cursor-grab text-line-strong"
                      aria-hidden
                    />

                    {/* R11.2. The item itself opens it. The three icons beside
                        it are the things that are not editing it. */}
                    <ItemDialog
                      church={church}
                      planId={planId}
                      item={item}
                      trigger={
                        <button
                          type="button"
                          // The tappable part says so: the hand, and the row
                          // lifting under it.
                          className="-mx-2 flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-md px-2 py-1 text-left transition-colors duration-instant hover:bg-sunken"
                        >
                          <span
                            data-numeric
                            className="w-[72px] shrink-0 whitespace-nowrap font-mono text-[12px] text-fg-subtle"
                          >
                            {toTime(item.startsAt)}
                          </span>

                          {/* A column of its own, so every title starts at the
                              same place however long the kind's word is. */}
                          <span className="w-[118px] shrink-0">
                            <span
                              className="inline-flex rounded-full px-2 py-0.5 text-[12px] font-medium"
                              style={{
                                background: `var(--hue-${hue}-tint)`,
                                color: `var(--hue-${hue}-key)`,
                              }}
                            >
                              {t(`order.kind.${item.kind}` as never)}
                            </span>
                          </span>

                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate font-medium text-fg">{item.title}</span>
                            {item.description ? (
                              <span className="truncate text-[12px] text-fg-subtle">
                                {item.description}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      }
                    />

                    {/* R11.6, R11.7. On the item's own line: a chart and an
                        instruction belong beside the song they are for. */}
                    {item.files.length > 0 || item.notes.length > 0 ? (
                      <span className="flex min-w-0 max-w-[260px] shrink items-center gap-1">
                        {item.files.map((file) => (
                          <Attachment
                            key={file.id}
                            file={file}
                            pending={pending}
                            onRemove={() => run(() => dropFile(file.id, church))}
                          />
                        ))}

                        {item.notes.map((note) => (
                          <span
                            key={note.id}
                            title={note.body}
                            className="inline-flex min-w-0 items-center gap-0.5 rounded-full border border-line px-2 py-0.5"
                          >
                            <MessageSquare className="size-3.5 shrink-0 text-fg-muted" aria-hidden />
                            <span className="truncate text-[12px] text-fg-muted">{note.body}</span>
                            <IconButton
                              label={t("order.note.remove")}
                              disabled={pending}
                              onClick={() => run(() => dropNote(note.id, church))}
                              className="size-6"
                            >
                              <X />
                            </IconButton>
                          </span>
                        ))}
                      </span>
                    ) : null}

                    <span
                      data-numeric
                      className="shrink-0 whitespace-nowrap font-mono text-[13px] text-fg-muted"
                    >
                      {t("order.runsMin", { count: item.minutes })}
                    </span>

                    <span className="flex shrink-0 items-center gap-0 [&_button]:size-8">
                      <AttachButton church={church} itemId={item.id} />
                      <NoteDialog church={church} itemId={item.id} />
                      <IconButton
                        label={t("order.remove")}
                        disabled={pending}
                        onClick={() => run(() => dropItem(item.id, church))}
                      >
                        <Trash2 />
                      </IconButton>
                    </span>
                  </div>

                </li>
              );
            })}
          </ul>
        )}

        <ItemDialog
          church={church}
          planId={planId}
          trigger={
            <button
              type="button"
              className="flex w-full items-center gap-2 border-t border-line bg-sunken px-4 py-3 text-left font-medium text-primary hover:bg-line"
            >
              <Plus className="size-4" /> {t("order.add")}
            </button>
          }
        />
      </section>

      <div className="flex flex-wrap items-center gap-2">
        {/* R11.8. The same shape most weeks, filled in differently. The kinds,
            the titles and the lengths come over. Last week's notes, files and
            theme stay with last week. */}
        <StartFrom
          church={church}
          planId={planId}
          templates={templates}
          sources={sources}
          disabled={pending}
        />
        <TemplateDialog
          church={church}
          planId={planId}
          templates={templates}
          empty={timed.length === 0}
        />
      </div>
    </div>
  );
}

function ItemDialog({
  church,
  planId,
  item,
  trigger,
}: {
  church: string;
  planId: string;
  item?: OrderItem;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [kind, setKind] = React.useState(item?.kind ?? "song");
  const [title, setTitle] = React.useState(item?.title ?? "");
  const [minutes, setMinutes] = React.useState(String(item?.minutes ?? 5));
  const [description, setDescription] = React.useState(item?.description ?? "");
  const [pending, startTransition] = React.useTransition();

  const submit = () => {
    startTransition(async () => {
      const result = await saveItem(
        planId,
        item?.id ?? null,
        {
          kind: kind as ItemKind,
          title,
          description: description || null,
          minutes: Number(minutes),
        },
        church,
      );
      setError(result.error);
      if (!result.error) {
        setOpen(false);
        if (!item) {
          setTitle("");
          setMinutes("5");
          setDescription("");
        }
        router.refresh();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={item ? item.title : t("order.add")} closeLabel={t("common.close")}>
        <div className="flex flex-col gap-4">
          {error ? <Banner tone="danger" title={t("order.failed")}>{error}</Banner> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <span className="text-label text-fg">{t("order.kind")}</span>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger aria-label={t("order.kind")}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KINDS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(`order.kind.${option}` as never)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Field label={t("order.minutes")}>
              <Input
                type="number"
                min={0}
                max={600}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
            </Field>
          </div>

          <Field label={t("order.item")} required>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </Field>

          <Field label={t("order.description")}>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("action.cancel")}
            </Button>
              <Button type="button" disabled={pending} onClick={submit}>{t("action.save")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * R11.6. Writing a note, and saying who it is for.
 *
 * The audience is the schedule rather than every team in the church, because a
 * note addressed to a position nobody is filling is a note nobody reads.
 */
function NoteDialog({ church, itemId }: { church: string; itemId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [body, setBody] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  /*
   * R11.6. A note on an item, read by everybody who reads the plan.
   *
   * It used to be addressed at a team, a position or a person. The screen
   * asking "who is this for" before the note had been written was a question
   * ahead of the thought, and the answers read badly, so a note is a note.
   */
  const submit = () => {
    startTransition(async () => {
      const result = await saveNote(
        { itemId, body, teamId: null, positionId: null, personId: null },
        church,
      );
      setError(result.error);
      if (!result.error) {
        setOpen(false);
        setBody("");
        router.refresh();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <IconButton label={t("order.note.add")}><MessageSquare /></IconButton>
      </DialogTrigger>
      <DialogContent title={t("order.note.add")} closeLabel={t("common.close")}>
        <div className="flex flex-col gap-4">
          {error ? <Banner tone="danger" title={t("order.failed")}>{error}</Banner> : null}

          <Field label={t("order.note.body")} required>
            <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} autoFocus />
          </Field>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("action.cancel")}
            </Button>
              <Button type="button" disabled={pending} onClick={submit}>{t("action.save")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** R11.7. One file on an item, with a signed link made when it is pressed. */
function Attachment({
  file,
  pending,
  onRemove,
}: {
  file: OrderFile;
  pending: boolean;
  onRemove: () => void;
}) {
  const [opening, setOpening] = React.useState(false);

  const open = () => {
    setOpening(true);
    fileLink(file.key)
      .then((url) => {
        if (url) window.open(url, "_blank", "noopener");
      })
      .finally(() => setOpening(false));
  };

  const full = file.label ?? file.key.split("/").pop() ?? file.contentType;

  /*
   * A key is a uuid and a label can be a sentence, so neither reads on a row.
   * The eye wants the kind of thing it is and a way to open it: the first
   * words, then the extension.
   */
  const dot = full.lastIndexOf(".");
  const stem = dot > 0 ? full.slice(0, dot) : full;
  const ext = dot > 0 ? full.slice(dot) : "";
  const name = (stem.length > 18 ? `${stem.slice(0, 18)}…` : stem) + ext;

  return (
    <span className="inline-flex max-w-full items-center gap-0.5 rounded-full border border-line px-2 py-0.5">
      <button
        type="button"
        onClick={open}
        disabled={opening}
        title={full}
        className="flex min-w-0 items-center gap-1.5 text-[12px] text-fg-muted underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
      >
        <Paperclip className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">{name}</span>
      </button>
      <IconButton
        label={t("order.file.remove")}
        disabled={pending}
        onClick={onRemove}
        className="size-6"
      >
        <X />
      </IconButton>
    </span>
  );
}

/**
 * R11.7. Attaching a file.
 *
 * It goes through the one upload path, which checks the type, the size and the
 * quota in the query layer before any bytes are written.
 */
function AttachButton({ church, itemId }: { church: string; itemId: string }) {
  const router = useRouter();
  const input = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);

  const send = async (file: File) => {
    setBusy(true);
    const form = new FormData();
    form.set("church", church);
    form.set("purpose", "plan_item");
    form.set("itemId", itemId);
    form.set("file", file);
    await fetch("/api/upload", { method: "POST", body: form });
    setBusy(false);
    router.refresh();
  };

  return (
    <>
      <input
        ref={input}
        type="file"
        className="sr-only"
        accept="application/pdf,image/png,image/jpeg,image/webp,audio/mpeg,audio/mp4,audio/ogg,audio/wav,text/plain"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void send(file);
          e.target.value = "";
        }}
      />
      <IconButton
        label={t("order.file.add")}
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        <Paperclip />
      </IconButton>
    </>
  );
}

/** R11.8. One press to lay an earlier plan or a saved shape onto this one. */
function StartFrom({
  church,
  planId,
  templates,
  sources,
  disabled,
}: {
  church: string;
  planId: string;
  templates: OrderTemplate[];
  sources: OrderSource[];
  disabled: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [looking, setLooking] = React.useState<{
    label: string;
    items: ShapeItem[];
    apply: () => Promise<{ error?: string }>;
  } | null>(null);
  const [failed, setFailed] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const summary = (items: number, minutes: number) =>
    t("order.summary", { items: String(items), minutes: String(minutes) });

  /** R11.8. Nothing is copied until it has been read. */
  const look = (
    label: string,
    source: Parameters<typeof shapeOf>[0],
    apply: () => Promise<{ error?: string }>,
  ) => {
    startTransition(async () => {
      const result = await shapeOf(source, church);
      setFailed(result.error);
      if (result.items) setLooking({ label, items: result.items, apply });
    });
  };

  const use = () => {
    const chosen = looking;
    if (!chosen) return;
    startTransition(async () => {
      const result = await chosen.apply();
      setFailed(result.error);
      if (result.error) return;
      setLooking(null);
      setOpen(false);
      router.refresh();
    });
  };

  /** One choice in the dialog: what it is, and how long it runs. */
  const choice = (key: string, label: string, detail: string, pick: () => void) => (
    <button
      key={key}
      type="button"
      disabled={pending}
      onClick={pick}
      className="flex w-full cursor-pointer flex-col rounded-md border border-line bg-surface px-4 py-3 text-left hover:bg-sunken disabled:opacity-50"
    >
      <span className="font-medium text-fg">{label}</span>
      <span className="text-[13px] text-fg-muted">{detail}</span>
    </button>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(on) => {
        setOpen(on);
        if (!on) {
          setLooking(null);
          setFailed(undefined);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" disabled={disabled || pending}>
          <Copy /> {t("order.start")}
        </Button>
      </DialogTrigger>

      <DialogContent
        title={looking ? looking.label : t("order.start.title")}
        closeLabel={t("common.close")}
      >
        {failed ? (
          <Banner tone="danger" title={t("order.failed")} className="mb-4">{failed}</Banner>
        ) : null}

        {looking ? (
          <div className="flex flex-col gap-4">
            {/* Read first: what these items are, before they land on a plan
                somebody may already have worked on. */}
            <ul className="flex max-h-[50vh] flex-col overflow-y-auto rounded-md border border-line">
              {looking.items.map((item, i) => (
                <li
                  key={`${item.title}-${i}`}
                  className="flex items-center gap-3 border-b border-sunken px-3.5 py-2.5 last:border-0"
                >
                  <span className="w-[110px] shrink-0 text-[13px] text-fg-subtle">
                    {t(`order.kind.${item.kind}` as never)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-fg">{item.title}</span>
                  <span data-numeric className="shrink-0 font-mono text-[13px] text-fg-muted">
                    {t("order.runsMin", { count: item.minutes })}
                  </span>
                </li>
              ))}
            </ul>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setLooking(null)}>
                {t("order.start.back")}
              </Button>
              <Button onClick={use} disabled={pending}>
                {t("order.start.use")}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">
            <section className="flex flex-col gap-2">
              <h3 className="text-[13px] font-medium text-fg-subtle">
                {t("order.start.templates")}
              </h3>
              {templates.length === 0 ? (
                <p className="text-[13px] text-fg-muted">{t("order.template.none")}</p>
              ) : (
                templates.map((template) =>
                  choice(
                    template.id,
                    template.name,
                    summary(template.items, template.minutes),
                    () =>
                      look(
                        template.name,
                        { kind: "template", id: template.id },
                        () => useTemplate(planId, template.id, church),
                      ),
                  ),
                )
              )}
            </section>

            {/* R11.8. A plan the church already ran is the other shape to start
                from, and usually the better one. The last two, because the one
                before that is a different season. */}
            <section className="flex flex-col gap-2">
              <h3 className="text-[13px] font-medium text-fg-subtle">{t("order.recent")}</h3>
              {sources.length === 0 ? (
                <p className="text-[13px] text-fg-muted">{t("order.recent.none")}</p>
              ) : (
                sources.slice(0, 2).map((source) =>
                  choice(
                    source.occurrenceId,
                    source.label,
                    summary(source.items, source.minutes),
                    () =>
                      look(
                        source.label,
                        { kind: "plan", occurrenceId: source.occurrenceId },
                        () => copyFrom(planId, source.occurrenceId, church),
                      ),
                  ),
                )
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * R11.8. Saving this plan's shape, and keeping the saved ones tidy.
 *
 * Saving under a name already in use replaces that shape, because a church
 * correcting its order of service is correcting one thing rather than
 * collecting versions of it.
 */
function TemplateDialog({
  church,
  planId,
  templates,
  empty,
}: {
  church: string;
  planId: string;
  templates: OrderTemplate[];
  empty: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [name, setName] = React.useState("");
  const [editing, setEditing] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  const run = (work: () => Promise<{ error?: string }>, after?: () => void) => {
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      if (!result.error) {
        after?.();
        router.refresh();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" disabled={empty}>
          <LayoutList /> {t("order.template.save")}
        </Button>
      </DialogTrigger>
      <DialogContent title={t("order.template.save")} closeLabel={t("common.close")}>
        <div className="flex flex-col gap-4" aria-busy={pending}>
          {error ? <Banner tone="danger" title={t("order.failed")}>{error}</Banner> : null}

          <Field label={t("order.template.name")} required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </Field>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("action.cancel")}
            </Button>
              <Button
              type="button"
              disabled={pending}
              onClick={() =>
                run(() => keepAsTemplate(planId, name, church), () => {
                  setName("");
                  setOpen(false);
                })
              }
            >
              {t("action.save")}
            </Button>
          </div>

          {templates.length > 0 ? (
            <>
              <Separator />
              <span className="text-label text-fg">{t("order.template.saved")}</span>
              <ul className="flex flex-col gap-2">
                {templates.map((template) => (
                  <li key={template.id} className="flex items-center gap-2">
                    {editing === template.id ? (
                      <>
                        <Input
                          className="flex-1"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          aria-label={t("order.template.name")}
                          autoComplete="off"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={pending}
                          onClick={() =>
                            run(
                              () => renamePlanTemplate(template.id, editName, church),
                              () => setEditing(null),
                            )
                          }
                        >
                          {t("action.save")}
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="text-[length:var(--d-text-body)] text-fg">
                            {template.name}
                          </span>
                          <span className="text-caption text-fg-muted">
                            {t("order.summary", {
                              items: String(template.items),
                              minutes: String(template.minutes),
                            })}
                          </span>
                        </span>
                        <IconButton
                          label={t("order.template.rename")}
                          disabled={pending}
                          onClick={() => {
                            setEditing(template.id);
                            setEditName(template.name);
                          }}
                        >
                          <Pencil />
                        </IconButton>
                        <IconButton
                          label={t("order.template.remove")}
                          disabled={pending}
                          onClick={() => run(() => dropTemplate(template.id, church))}
                        >
                          <Trash2 />
                        </IconButton>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

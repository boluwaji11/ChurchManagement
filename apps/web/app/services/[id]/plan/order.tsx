"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Trash2, GripVertical, Pencil, MessageSquare, X, Paperclip,
  Copy, LayoutList,
} from "lucide-react";
import {
  Banner, Button, Field, IconButton, Input, Separator, Textarea,
  Dialog, DialogTrigger, DialogContent,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import type { ItemKind } from "@hearth/db";
import {
  saveItem, dropItem, reorder, saveNote, dropNote, dropFile, fileLink,
  keepAsTemplate, renamePlanTemplate, dropTemplate, useTemplate, copyFrom,
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

/** R11.6. Who a note can be addressed to on this gathering. */
export interface Audience {
  teams: { id: string; name: string }[];
  positions: { id: string; name: string; teamName: string }[];
  people: { id: string; name: string; positionName: string }[];
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
  audience,
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
  audience: Audience;
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

  /**
   * R11.2. Dropping an item on another puts it in that place.
   *
   * The whole order is sent rather than a direction, so a card moved five rows
   * is one write and the plan is never half reordered.
   */
  const dropOn = (overId: string) => {
    const from = items.findIndex((one) => one.id === dragging);
    const to = items.findIndex((one) => one.id === overId);
    setDragging(null);
    if (from === -1 || to === -1 || from === to) return;

    const order = items.map((one) => one.id);
    const [moved] = order.splice(from, 1);
    order.splice(to, 0, moved!);
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
                  onDragStart={() => setDragging(item.id)}
                  onDragEnd={() => setDragging(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => dropOn(item.id)}
                  className="flex flex-wrap items-center gap-2.5 border-b border-sunken px-4 py-3 last:border-0"
                >
                  <GripVertical className="size-4 shrink-0 cursor-grab text-line-strong" aria-hidden />

                  <span
                    data-numeric
                    className="w-[72px] shrink-0 whitespace-nowrap font-mono text-[12px] text-fg-subtle"
                  >
                    {toTime(item.startsAt)}
                  </span>

                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[12px] font-medium"
                    style={{
                      background: `var(--hue-${hue}-tint)`,
                      color: `var(--hue-${hue}-key)`,
                    }}
                  >
                    {t(`order.kind.${item.kind}` as never)}
                  </span>

                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-medium text-fg">{item.title}</span>
                    {item.description ? (
                      <span className="text-[12px] text-fg-subtle">{item.description}</span>
                    ) : null}

                    {/* R11.7. Charts, tracks and sheets, opened through a
                        signed link because the bucket is private. */}
                    {item.files.length > 0 ? (
                      <ul className="mt-1 flex flex-wrap gap-2">
                        {item.files.map((file) => (
                          <li key={file.id}>
                            <Attachment
                              file={file}
                              pending={pending}
                              onRemove={() => run(() => dropFile(file.id, church))}
                            />
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {/* R11.6. The instructions, each labelled with who it is
                        for, so a leader can see the drummer has been told. */}
                    {item.notes.length > 0 ? (
                      <ul className="mt-1 flex flex-col gap-1">
                        {item.notes.map((note) => (
                          <li key={note.id} className="flex items-start gap-2">
                            <MessageSquare
                              className="mt-0.5 size-3.5 shrink-0 text-fg-subtle"
                              aria-hidden
                            />
                            <span className="text-[12px] text-fg-muted">
                              {note.audience ? (
                                <span className="font-medium text-fg">{note.audience} </span>
                              ) : null}
                              {note.body}
                            </span>
                            <IconButton
                              label={t("order.note.remove")}
                              disabled={pending}
                              onClick={() => run(() => dropNote(note.id, church))}
                            >
                              <X />
                            </IconButton>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </span>

                  <span
                    data-numeric
                    className="shrink-0 whitespace-nowrap font-mono text-[13px] text-fg-muted"
                  >
                    {t("order.runsMin", { count: item.minutes })}
                  </span>

                  <span className="flex shrink-0 items-center gap-0 [&_button]:size-8">
                    <AttachButton church={church} itemId={item.id} />
                    <NoteDialog church={church} itemId={item.id} audience={audience} />
                    <ItemDialog
                      church={church}
                      planId={planId}
                      item={item}
                      trigger={<IconButton label={t("action.edit")}><Pencil /></IconButton>}
                    />
                    <IconButton
                      label={t("order.remove")}
                      disabled={pending}
                      onClick={() => run(() => dropItem(item.id, church))}
                    >
                      <Trash2 />
                    </IconButton>
                  </span>
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

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" disabled={pending} onClick={submit}>{t("action.save")}</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("action.cancel")}
            </Button>
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
function NoteDialog({
  church,
  itemId,
  audience,
}: {
  church: string;
  itemId: string;
  audience: Audience;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [body, setBody] = React.useState("");
  const [who, setWho] = React.useState("everyone");
  const [pending, startTransition] = React.useTransition();

  const submit = () => {
    const [kind, id] = who.split(":");
    startTransition(async () => {
      const result = await saveNote(
        {
          itemId,
          body,
          teamId: kind === "team" ? id! : null,
          positionId: kind === "position" ? id! : null,
          personId: kind === "person" ? id! : null,
        },
        church,
      );
      setError(result.error);
      if (!result.error) {
        setOpen(false);
        setBody("");
        setWho("everyone");
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

          <div className="flex flex-col gap-1.5">
            <span className="text-label text-fg">{t("order.note.who")}</span>
            <Select value={who} onValueChange={setWho}>
              <SelectTrigger aria-label={t("order.note.who")}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone">{t("order.note.everyone")}</SelectItem>
                {audience.teams.map((team) => (
                  <SelectItem key={team.id} value={`team:${team.id}`}>{team.name}</SelectItem>
                ))}
                {audience.positions.map((position) => (
                  <SelectItem key={position.id} value={`position:${position.id}`}>
                    {position.teamName} {position.name}
                  </SelectItem>
                ))}
                {audience.people.map((person) => (
                  <SelectItem key={person.id} value={`person:${person.id}`}>
                    {person.name} {person.positionName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" disabled={pending} onClick={submit}>{t("action.save")}</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("action.cancel")}
            </Button>
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

  const name = file.label ?? file.key.split("/").pop() ?? file.contentType;

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-0.5">
      <button
        type="button"
        onClick={open}
        disabled={opening}
        className="flex items-center gap-1.5 text-caption text-fg underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
      >
        <Paperclip className="size-3.5 text-fg-muted" aria-hidden />
        {name}
      </button>
      <IconButton label={t("order.file.remove")} disabled={pending} onClick={onRemove}>
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
  const [pending, startTransition] = React.useTransition();

  const run = (work: () => Promise<{ error?: string }>) => {
    startTransition(async () => {
      await work();
      router.refresh();
    });
  };

  const summary = (items: number, minutes: number) =>
    t("order.summary", { items: String(items), minutes: String(minutes) });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" disabled={disabled || pending}>
          <Copy /> {t("order.start")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-w-xs">
        {sources.length === 0 ? (
          <DropdownMenuItem disabled>{t("order.recent.none")}</DropdownMenuItem>
        ) : (
          sources.map((source) => (
            <DropdownMenuItem
              key={source.occurrenceId}
              onSelect={() => run(() => copyFrom(planId, source.occurrenceId, church))}
            >
              <span className="flex flex-col">
                <span>{source.label}</span>
                <span className="text-caption text-fg-muted">
                  {summary(source.items, source.minutes)}
                </span>
              </span>
            </DropdownMenuItem>
          ))
        )}

        <DropdownMenuSeparator />

        {templates.length === 0 ? (
          <DropdownMenuItem disabled>{t("order.template.none")}</DropdownMenuItem>
        ) : (
          templates.map((template) => (
            <DropdownMenuItem
              key={template.id}
              onSelect={() => run(() => useTemplate(planId, template.id, church))}
            >
              <span className="flex flex-col">
                <span>{template.name}</span>
                <span className="text-caption text-fg-muted">
                  {summary(template.items, template.minutes)}
                </span>
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
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

          <div className="flex flex-wrap items-center gap-3">
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
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("action.cancel")}
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

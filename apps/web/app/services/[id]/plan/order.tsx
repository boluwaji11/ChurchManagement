"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, GripVertical, StickyNote, X, Paperclip,
  Copy, LayoutList, ArrowUp, ArrowDown, ArrowLeft,
} from "lucide-react";
import {
  Banner, Button, Field, IconButton, Input, Spinner, Textarea, cn,
  Dialog, DialogTrigger, DialogContent, DialogFooter,
  Sheet, SheetTrigger, SheetContent,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectCreate, Tooltip
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { UPLOAD_RULES } from "@connectapp/db/rules";
import type { ItemKind, ShapeItem } from "@connectapp/db";
import { kindLabel, type KindOption } from "@/lib/kind-label";
import { useFormError } from "@/lib/form-error";
import { Confirm } from "@/components/confirm";
import {
  saveItem, dropItem, reorder, saveNote, dropNote, dropFile, fileLink,
  keepAsTemplate, useTemplate, shapeOf,
} from "./actions";
import { dragShape } from "@/lib/drag-shadow";

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

/** R11.8. A shape the church keeps, offered as a start. */
export interface OrderTemplate {
  id: string;
  name: string;
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
  kinds,
}: {
  church: string;
  occurrenceId: string;
  planId: string;
  serviceStartsAt: string;
  series: string | null;
  theme: string | null;
  items: OrderItem[];
  templates: OrderTemplate[];
  /** R11.2. The kinds this church files an item under, in its own words. */
  kinds: KindOption[];
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();
  /* Which row's action is running, so only the control pressed spins. */
  const [doing, setDoing] = React.useState<string>();

  React.useEffect(() => {
    if (!pending) setDoing(undefined);
  }, [pending]);

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
    run("reorder", () => reorder(planId, order, church));
  };

  /**
   * R11.2. The same move, one row at a time.
   *
   * Nothing drags on a touch screen, and the order of service is the screen a
   * church runs its gathering from, so the arrows do on a phone what the
   * handle does with a mouse.
   */
  const moveBy = (key: string, id: string, by: number) => {
    const order = items.map((one) => one.id);
    const from = order.indexOf(id);
    const to = from + by;
    if (from === -1 || to < 0 || to >= order.length) return;
    order.splice(to, 0, ...order.splice(from, 1));
    run(key, () => reorder(planId, order, church));
  };

  const run = (key: string, work: () => Promise<{ error?: string }>) => {
    setDoing(key);
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      if (!result.error) router.refresh();
    });
  };

  return (
    <div className="@container flex flex-col gap-4" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("order.failed")}>{error}</Banner> : null}

      {/* R11.8. Above the plan and to the right, where a table's own actions
          sit. The same shape most weeks, filled in differently: the kinds, the
          titles and the lengths come over, and last week's notes, files and
          theme stay with last week. */}
      <div className="flex flex-wrap items-center gap-2">
        {/* What the handles down the left are for, beside them. */}
        {/* Dragging is a pointer's way of reordering. A phone gets the two
            arrows on each row instead. */}
        <span className="hidden flex-1 items-center gap-1.5 text-[12px] text-fg-subtle @xl:flex">
          <GripVertical className="size-3.5" aria-hidden /> {t("order.dragHint")}
        </span>
        <StartFrom
          church={church}
          planId={planId}
          templates={templates}
          kinds={kinds}
          disabled={pending}
        />
        <TemplateDialog
          church={church}
          planId={planId}
          empty={timed.length === 0}
        />
      </div>

      <section className="overflow-hidden rounded-lg border border-line bg-surface">
        {timed.length === 0 ? (
          /* A plain line rather than an illustration: the press that fills it
             is at the top of the screen, and a picture here would only push
             the order further down. */
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
                    dragShape(e);
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
                  <div className="flex flex-wrap items-center gap-2.5 px-4 py-3 @xl:flex-nowrap">
                    <GripVertical
                      className="hidden size-4 shrink-0 cursor-grab text-line-strong @xl:block"
                      aria-hidden
                    />

                    {/* R11.2. The item itself opens it. The three icons beside
                        it are the things that are not editing it. */}
                    <ItemDialog
                      church={church}
                      planId={planId}
                      item={item}
                      kinds={kinds}
                      trigger={
                        <button
                          type="button"
                          // The tappable part says so: the hand, and the row
                          // lifting under it.
                          className="-mx-2 flex w-full min-w-0 cursor-pointer flex-wrap items-center gap-x-2.5 gap-y-1 rounded-md px-2 py-1 text-left transition-colors duration-instant hover:bg-sunken @xl:w-auto @xl:flex-1 @xl:flex-nowrap"
                        >
                          <span
                            data-numeric
                            className="w-[72px] shrink-0 whitespace-nowrap font-mono text-[12px] text-fg-subtle"
                          >
                            {toTime(item.startsAt)}
                          </span>

                          {/* A column of its own, so every title starts at the
                              same place however long the kind's word is. */}
                          <span className="shrink-0 @xl:w-[118px]">
                            <span
                              className="inline-flex rounded-full px-2 py-0.5 text-[12px] font-medium"
                              style={{
                                background: `var(--hue-${hue}-tint)`,
                                color: `var(--hue-${hue}-key)`,
                              }}
                            >
                              {kindLabel(item.kind, kinds)}
                            </span>
                          </span>

                          <span className="flex w-full min-w-0 flex-col @xl:w-auto @xl:flex-1">
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
                      <span className="flex w-full min-w-0 shrink items-center gap-1 @xl:w-auto @xl:max-w-[260px]">
                        {item.files.map((file) => (
                          <Attachment
                            key={file.id}
                            church={church}
                            file={file}
                            pending={pending}
                            removing={doing === `file:${file.id}`}
                            onRemove={() => run(`file:${file.id}`, () => dropFile(file.id, church))}
                          />
                        ))}

                        {item.notes.map((note) => (
                          <Tooltip key={note.id} content={note.body}>
                          <span
                            className="inline-flex min-w-0 items-center gap-0.5 rounded-full border border-line px-2 py-0.5"
                          >
                            <StickyNote className="size-3.5 shrink-0 text-fg-muted" aria-hidden />
                            <span className="truncate text-[12px] text-fg-muted">{note.body}</span>
                            <IconButton
                              label={t("order.note.remove")}
                              disabled={pending}
                              onClick={() => run(`note:${note.id}`, () => dropNote(note.id, church))}
                              className="size-6"
                            >
                              {doing === `note:${note.id}` ? (
                                <Spinner label={t("order.note.remove")} />
                              ) : (
                                <X />
                              )}
                            </IconButton>
                          </span>
                          </Tooltip>
                        ))}
                      </span>
                    ) : null}

                    <span
                      data-numeric
                      className="shrink-0 whitespace-nowrap font-mono text-[13px] text-fg-muted"
                    >
                      {t("order.runsMin", { count: item.minutes })}
                    </span>

                    <span className="ml-auto flex shrink-0 items-center gap-0 [&_button]:size-8">
                      {/* R11.2. Moving an item without a mouse. */}
                      <IconButton
                        label={t("order.moveUp")}
                        className="@xl:hidden"
                        disabled={pending || i === 0}
                        onClick={() => moveBy(`up:${item.id}`, item.id, -1)}
                      >
                        {doing === `up:${item.id}` ? (
                          <Spinner label={t("order.moveUp")} />
                        ) : (
                          <ArrowUp />
                        )}
                      </IconButton>
                      <IconButton
                        label={t("order.moveDown")}
                        className="@xl:hidden"
                        disabled={pending || i === timed.length - 1}
                        onClick={() => moveBy(`down:${item.id}`, item.id, 1)}
                      >
                        {doing === `down:${item.id}` ? (
                          <Spinner label={t("order.moveDown")} />
                        ) : (
                          <ArrowDown />
                        )}
                      </IconButton>
                      <AttachButton church={church} itemId={item.id} />
                      <NoteDialog church={church} itemId={item.id} />
                      {/* R24.x. The x takes the item off this plan, and asks
                          first. */}
                      <Confirm
                        title={t("order.remove.title", { name: item.title })}
                        confirmLabel={t("order.remove")}
                        disabled={pending}
                        onConfirm={() => run(`item:${item.id}`, () => dropItem(item.id, church))}
                        trigger={
                          <IconButton label={t("order.remove")} disabled={pending}>
                            {doing === `item:${item.id}` ? (
                              <Spinner label={t("order.remove")} />
                            ) : (
                              <X />
                            )}
                          </IconButton>
                        }
                      />
                    </span>
                  </div>

                </li>
              );
            })}
          </ul>
        )}

      </section>

    </div>
  );
}

/**
 * R11.2, R24.6. Writing an item down, from the top of the screen.
 *
 * It sat at the foot of the order, which meant the screen had two places a
 * press lived and no two screens agreed which. The order is still what it
 * appends to: a new item goes on the end.
 */
export function AddItem({
  church,
  planId,
  kinds,
}: {
  church: string;
  planId: string;
  kinds: KindOption[];
}) {
  return (
    <ItemDialog
      church={church}
      planId={planId}
      kinds={kinds}
      trigger={<Button><Plus /> {t("order.add")}</Button>}
    />
  );
}

function ItemDialog({
  church,
  planId,
  item,
  kinds,
  trigger,
}: {
  church: string;
  planId: string;
  item?: OrderItem;
  kinds: KindOption[];
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = useFormError(open);
  const [kind, setKind] = React.useState(item?.kind ?? kinds[0]?.slug ?? "custom");
  const [title, setTitle] = React.useState(item?.title ?? "");
  const [minutes, setMinutes] = React.useState(String(item?.minutes ?? 5));
  const [description, setDescription] = React.useState(item?.description ?? "");
  const [pending, startTransition] = React.useTransition();

  /* The panel is filled from the item each time it opens, so an abandoned
     draft, or a kind picked for the last item, is gone by the next one. */
  React.useEffect(() => {
    if (!open) return;
    setKind(item?.kind ?? kinds[0]?.slug ?? "custom");
    setTitle(item?.title ?? "");
    setMinutes(String(item?.minutes ?? 5));
    setDescription(item?.description ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.kind, item?.title, item?.minutes, item?.description, kinds[0]?.slug]);

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
        router.refresh();
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        title={item ? item.title : t("order.add")}
        closeLabel={t("common.close")}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              {t("action.cancel")}
            </Button>
            <Button
              type="button"
              loading={pending}
              disabled={pending || !title.trim()}
              onClick={submit}
            >
              {t("action.save")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {error ? <Banner tone="danger" title={t("order.failed")}>{error}</Banner> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("order.kind")}>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger aria-label={t("order.kind")}><SelectValue /></SelectTrigger>
                <SelectContent
                  create={
                    <SelectCreate href={`/settings/service-type?church=${church}`}>
                      {t("itemKind.create")}
                    </SelectCreate>
                  }
                >
                  {kinds
                    .filter((option) => !option.archived || option.slug === kind)
                    .map((option) => (
                      <SelectItem key={option.slug} value={option.slug}>
                        {option.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>

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

        </div>
      </SheetContent>
    </Sheet>
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
  const [error, setError] = useFormError(open);
  const [body, setBody] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) setBody("");
  };

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
        { itemId, body, teamId: null, positionId: null, memberId: null },
        church,
      );
      setError(result.error);
      if (!result.error) {
        close(false);
        router.refresh();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogTrigger asChild>
        <IconButton label={t("order.note.add")}><StickyNote /></IconButton>
      </DialogTrigger>
      <DialogContent title={t("order.note.add")} closeLabel={t("common.close")}>
        <div className="flex flex-col gap-4">
          {error ? <Banner tone="danger" title={t("order.failed")}>{error}</Banner> : null}

          <Field label={t("order.note.body")} required>
            <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} autoFocus />
          </Field>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => close(false)}>
              {t("action.cancel")}
            </Button>
              <Button type="button" loading={pending} disabled={!body.trim()} onClick={submit}>{t("action.save")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** R11.7. One file on an item, with a signed link made when it is pressed. */
function Attachment({
  church,
  file,
  pending,
  removing,
  onRemove,
}: {
  church: string;
  file: OrderFile;
  pending: boolean;
  removing: boolean;
  onRemove: () => void;
}) {
  const [opening, setOpening] = React.useState(false);

  const full = file.label ?? file.key.split("/").pop() ?? file.contentType;

  const open = () => {
    setOpening(true);
    fileLink(file.key, church, full)
      .then((url) => {
        if (url) window.open(url, "_blank", "noopener");
      })
      .finally(() => setOpening(false));
  };

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
      <Tooltip content={full}>
      <button
        type="button"
        onClick={open}
        disabled={opening}
        className="flex min-w-0 cursor-pointer items-center gap-1.5 text-[12px] text-fg-muted underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
      >
        {opening ? (
          <Spinner className="size-3.5 shrink-0 [&>span]:size-3.5" label={t("order.file.open")} />
        ) : (
          <Paperclip className="size-3.5 shrink-0" aria-hidden />
        )}
        <span className="truncate">{name}</span>
      </button>
      </Tooltip>
      <Confirm
        title={t("order.file.removeTitle", { name: full })}
        confirmLabel={t("order.file.remove")}
        disabled={pending}
        onConfirm={onRemove}
        trigger={
          <IconButton
            label={t("order.file.remove")}
            disabled={pending}
            className="size-6"
          >
            {removing ? <Spinner label={t("order.file.remove")} /> : <X />}
          </IconButton>
        }
      />
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
    /* R11.7. Filed under the name it arrived with, so the row reads as the
       document rather than as the id it is stored under. */
    form.set("label", file.name);
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
        /* Read off the same rule the server enforces, so the box cannot
           offer a kind the upload then refuses. */
        accept={UPLOAD_RULES.plan_item.types.join(",")}
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
        {busy ? <Spinner label={t("order.file.add")} /> : <Paperclip />}
      </IconButton>
    </>
  );
}

/** R11.8. One press to lay an earlier plan or a saved shape onto this one. */
function StartFrom({
  church,
  planId,
  templates,
  kinds,
  disabled,
}: {
  church: string;
  planId: string;
  templates: OrderTemplate[];
  kinds: KindOption[];
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
  const [term, setTerm] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  /* The shape being read, so the card pressed is the one that spins. */
  const [reading, setReading] = React.useState<string>();

  React.useEffect(() => {
    if (!pending) setReading(undefined);
  }, [pending]);

  const found = templates.filter((one) =>
    one.name.toLowerCase().includes(term.trim().toLowerCase()),
  );

  const summary = (items: number, minutes: number) =>
    t("order.summary", { items: String(items), minutes: String(minutes) });

  /** R11.8. Nothing is copied until it has been read. */
  const look = (
    key: string,
    label: string,
    source: Parameters<typeof shapeOf>[0],
    apply: () => Promise<{ error?: string }>,
  ) => {
    setReading(key);
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
      <span className="flex items-center gap-2 font-medium text-fg">
        {label}
        {reading === key ? <Spinner label={label} /> : null}
      </span>
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
          setTerm("");
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
        /* The way back out of one shape and into the list it came from, where
           a reader already looks for it. */
        lead={
          looking ? (
            <IconButton
              label={t("order.start.back")}
              variant="ghost"
              className="size-8 min-h-0 [&_svg]:size-4"
              onClick={() => setLooking(null)}
            >
              <ArrowLeft />
            </IconButton>
          ) : undefined
        }
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
                    {kindLabel(item.kind, kinds)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-fg">{item.title}</span>
                  <span data-numeric className="shrink-0 font-mono text-[13px] text-fg-muted">
                    {t("order.runsMin", { count: item.minutes })}
                  </span>
                </li>
              ))}
            </ul>

            <DialogFooter>
              <Button onClick={use} loading={pending}>
                {t("order.start.use")}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
            {/* R11.8. A church with a dozen shapes reads them by name, so the
                list is filtered rather than scrolled. */}
            {templates.length > 5 ? (
              <Input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder={t("planTpl.search")}
                aria-label={t("planTpl.search")}
                autoComplete="off"
              />
            ) : null}

            {templates.length === 0 ? (
              <p className="text-[13px] text-fg-muted">{t("order.template.none")}</p>
            ) : found.length === 0 ? (
              <p className="text-[13px] text-fg-muted">{t("planTpl.noMatch", { term })}</p>
            ) : (
              found.map((template) =>
                choice(
                  template.id,
                  template.name,
                  summary(template.items, template.minutes),
                  () =>
                    look(
                      template.id,
                      template.name,
                      { kind: "template", id: template.id },
                      () => useTemplate(planId, template.id, church),
                    ),
                ),
              )
            )}

            {/* Where the shapes themselves are written and changed. */}
            <Link
              href={`/settings/service-template?church=${church}`}
              className="mt-1 self-start font-medium text-primary"
            >
              {t("planTpl.manage")}
            </Link>
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
  empty,
}: {
  church: string;
  planId: string;
  empty: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = useFormError(open);
  const [name, setName] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  /* Which of the saved shapes is being written, so one control spins. */
  const [doing, setDoing] = React.useState<string>();

  React.useEffect(() => {
    if (!pending) setDoing(undefined);
  }, [pending]);

  /* Blank on every close, so the next plan saved does not open holding the
     name the last one was given. */
  const close = (next: boolean) => {
    setOpen(next);
    if (!next) setName("");
  };

  const run = (key: string, work: () => Promise<{ error?: string }>, after?: () => void) => {
    setDoing(key);
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
    <Sheet open={open} onOpenChange={close}>
      <SheetTrigger asChild>
        <Button variant="ghost" disabled={empty}>
          <LayoutList /> {t("order.template.save")}
        </Button>
      </SheetTrigger>
      <SheetContent
        title={t("order.template.save")}
        closeLabel={t("common.close")}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => close(false)}>
              {t("action.cancel")}
            </Button>
            <Button
              type="button"
              loading={doing === "keep"}
              disabled={pending || !name.trim()}
              onClick={() =>
                run("keep", () => keepAsTemplate(planId, name, church), () => close(false))
              }
            >
              {t("action.save")}
            </Button>
          </>
        }
      >
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
        </div>
      </SheetContent>
    </Sheet>
  );
}

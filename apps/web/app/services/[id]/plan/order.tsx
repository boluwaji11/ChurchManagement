"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ChevronUp, ChevronDown, Pencil, MessageSquare, X } from "lucide-react";
import {
  Banner, Button, Card, EmptyState, Field, IconButton, Input, Separator, Textarea,
  Dialog, DialogTrigger, DialogContent,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import type { ItemKind } from "@hearth/db";
import { saveHeader, saveItem, dropItem, shiftItem, saveNote, dropNote } from "./actions";

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
}

export interface OrderNote {
  id: string;
  body: string;
  audience: string | null;
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
export function Order({
  church,
  planId,
  serviceStartsAt,
  series,
  theme,
  items,
  audience,
}: {
  church: string;
  planId: string;
  serviceStartsAt: string;
  series: string | null;
  theme: string | null;
  items: OrderItem[];
  audience: Audience;
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
  const total = at - start;

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

      <Header church={church} planId={planId} series={series} theme={theme} />

      <Card className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <span className="font-display text-heading text-fg">
            {t("order.endsAt", { time: toTime(at) })}
          </span>
          <span className="text-caption text-fg-muted tabular-nums">
            {plural("order.runs", total)}
          </span>
        </div>

        <Separator />

        {timed.length === 0 ? (
          <EmptyState title={t("order.empty")} />
        ) : (
          <ul className="flex flex-col">
            {timed.map((item, i) => (
              <li key={item.id}>
                {i > 0 ? <Separator className="my-2" /> : null}
                <div className="flex flex-wrap items-center gap-3">
                  <span className="w-20 shrink-0 text-caption text-fg-muted tabular-nums">
                    {toTime(item.startsAt)}
                  </span>

                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[length:var(--d-text-body)] text-fg">{item.title}</span>
                      <span className="text-caption text-fg-muted">
                        {t(`order.kind.${item.kind}` as never)}
                      </span>
                    </span>
                    {item.description ? (
                      <span className="text-caption text-fg-muted">{item.description}</span>
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
                            <span className="text-caption text-fg-muted">
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

                  <span className="w-12 shrink-0 text-right text-caption text-fg-muted tabular-nums">
                    {item.minutes}
                  </span>

                  <span className="flex items-center gap-0.5">
                    <IconButton
                      label={t("order.up")}
                      disabled={pending || i === 0}
                      onClick={() => run(() => shiftItem(planId, item.id, "up", church))}
                    >
                      <ChevronUp />
                    </IconButton>
                    <IconButton
                      label={t("order.down")}
                      disabled={pending || i === timed.length - 1}
                      onClick={() => run(() => shiftItem(planId, item.id, "down", church))}
                    >
                      <ChevronDown />
                    </IconButton>
                    <NoteDialog church={church} itemId={item.id} audience={audience} />
                    <ItemDialog
                      church={church}
                      planId={planId}
                      item={item}
                      trigger={
                        <IconButton label={t("action.edit")}><Pencil /></IconButton>
                      }
                    />
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
            ))}
          </ul>
        )}

        <div>
          <ItemDialog
            church={church}
            planId={planId}
            trigger={<Button variant="secondary"><Plus /> {t("order.add")}</Button>}
          />
        </div>
      </Card>
    </div>
  );
}

/** R11.1. The series and the theme, which a church fills in once a term. */
function Header({
  church,
  planId,
  series,
  theme,
}: {
  church: string;
  planId: string;
  series: string | null;
  theme: string | null;
}) {
  const router = useRouter();
  const [values, setValues] = React.useState({ series: series ?? "", theme: theme ?? "" });
  const [pending, startTransition] = React.useTransition();

  const save = () => {
    startTransition(async () => {
      await saveHeader(
        planId,
        { series: values.series || null, theme: values.theme || null },
        church,
      );
      router.refresh();
    });
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2" aria-busy={pending}>
      <Field label={t("order.series")}>
        <Input
          value={values.series}
          onChange={(e) => setValues({ ...values, series: e.target.value })}
          onBlur={save}
          autoComplete="off"
        />
      </Field>
      <Field label={t("order.theme")}>
        <Input
          value={values.theme}
          onChange={(e) => setValues({ ...values, theme: e.target.value })}
          onBlur={save}
          autoComplete="off"
        />
      </Field>
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

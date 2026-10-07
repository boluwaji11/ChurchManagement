"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Archive, ArrowLeft, GripVertical, Plus, Trash2, Undo2 } from "lucide-react";
import {
  Banner, Button, Field, IconButton, Input, LIFT, cn,
  Dialog, DialogContent, DialogFooter,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Sheet, SheetContent, SheetTrigger,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import type { TemplateShape } from "@connectapp/db";
import { Empty } from "@/components/empty";
import { usePanelGuard } from "@/components/panel-guard";
import { LibraryPicker } from "@/components/library-picker";
import { useFormError } from "@/lib/form-error";
import { planTemplateLibrary, type ShapeLine } from "./library";
import { saveTemplate, archiveTemplate } from "./actions";

const summary = (lines: { minutes: number }[]) =>
  t("order.summary", {
    items: String(lines.length),
    minutes: String(lines.reduce((sum, line) => sum + line.minutes, 0)),
  });

/**
 * R11.8. The shapes a church's services run to.
 *
 * A tile each, the way the group types and the rooms are drawn, and the whole
 * tile opens it. What is kept is the shape: the kinds, the titles and the
 * lengths, which is what carries from one week to the next.
 */
export function TemplateManager({
  church,
  templates,
  kinds,
}: {
  church: string;
  templates: TemplateShape[];
  /** R11.2. The kinds an item can be, read from the data layer by the page. */
  kinds: string[];
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();
  /*
   * R24.6. The question is asked in a box of its own, after the panel has
   * closed, so the confirmation reads the way every other one in the product
   * does and nothing is stacked on anything.
   */
  const [asking, setAsking] = React.useState<TemplateShape | null>(null);

  const run = (work: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      if (!result.error) router.refresh();
    });

  const live = templates.filter((one) => !one.archived);
  const archived = templates.filter((one) => one.archived);
  const taken = templates.map((one) => one.name);

  return (
    <div className="flex flex-col gap-4" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("planTpl.failed")}>{error}</Banner> : null}

      {live.length === 0 && archived.length === 0 ? (
        <Empty
          icon="calendar"
          title={t("planTpl.empty.title")}
          body={t("planTpl.empty.body")}
          action={<TemplatePanel church={church} pending={pending} taken={taken} kinds={kinds} />}
        />
      ) : (
        <>
          <div className="flex justify-end">
            <TemplatePanel church={church} pending={pending} taken={taken} kinds={kinds} />
          </div>

          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
            {live.map((one) => (
              <TemplatePanel
                key={one.id}
                church={church}
                pending={pending}
                template={one}
                taken={taken}
                kinds={kinds}
                onArchive={() => setAsking(one)}
                trigger={
                  <button
                    type="button"
                    className={`flex cursor-pointer flex-col gap-1 rounded-[14px] border border-line bg-surface p-4 text-left ${LIFT}`}
                  >
                    <span className="truncate font-semibold text-fg">{one.name}</span>
                    <span className="text-[13px] text-fg-muted">{summary(one.lines)}</span>
                  </button>
                }
              />
            ))}
          </div>
        </>
      )}

      {archived.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-label text-fg-muted">{t("planTpl.archived")}</h2>
          {archived.map((one) => (
            <div key={one.id} className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-[length:var(--d-text-body)] text-fg-muted">{one.name}</span>
              <Button
                variant="ghost"
                disabled={pending}
                className="h-8 min-h-0 px-2.5 text-[13px]"
                onClick={() => run(() => archiveTemplate(one.id, false, church))}
              >
                <Undo2 className="size-4" aria-hidden /> {t("planTpl.restore")}
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <Dialog open={asking !== null} onOpenChange={(on) => (on ? null : setAsking(null))}>
        <DialogContent
          alert
          title={t("planTpl.archiveTitle", { name: asking?.name ?? "" })}
        >
          <p className="text-[length:var(--d-text-body)] text-fg">{t("planTpl.archiveBody")}</p>

          <DialogFooter>
            <Button variant="ghost" data-dismiss onClick={() => setAsking(null)}>
              {t("planTpl.keep")}
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                const one = asking;
                setAsking(null);
                if (one) run(() => archiveTemplate(one.id, true, church));
              }}
            >
              {t("planTpl.archive")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** R11.8. Writing a shape down, or changing one. */
function TemplatePanel({
  church,
  pending,
  template,
  taken = [],
  kinds,
  trigger,
  onArchive,
}: {
  church: string;
  pending: boolean;
  kinds: string[];
  /** Given when an existing shape is being changed. */
  template?: TemplateShape;
  /** What this church already keeps, so the library leaves it out. */
  taken?: string[];
  trigger?: React.ReactNode;
  /** Asked for in a box of its own, so the panel closes before the question. */
  onArchive?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [saving, startTransition] = React.useTransition();
  const [dirty, setDirty] = React.useState(false);

  const library = React.useMemo(
    () => planTemplateLibrary(taken),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [taken.join("|")],
  );
  const [picking, setPicking] = React.useState(!template && library.length > 0);
  const [error, setError] = useFormError(open && !picking);
  const [name, setName] = React.useState(template?.name ?? "");
  const [lines, setLines] = React.useState<ShapeLine[]>(template?.lines ?? []);

  /* R24.6. The panel is filled from the record each time it opens, so a saved
     edit is not still showing what it held before the save. */
  React.useEffect(() => {
    if (!open) return;
    setName(template?.name ?? "");
    setLines(template?.lines ?? []);
  }, [open, template?.name, template?.lines]);

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setDirty(false);
      setPicking(!template && library.length > 0);
    }
  };
  const { onOpenChange, guard } = usePanelGuard({ dirty, setOpen: close });

  const change = (next: ShapeLine[]) => {
    setLines(next);
    setDirty(true);
  };

  const save = () =>
    startTransition(async () => {
      const result = await saveTemplate(
        { id: template?.id, name, items: lines },
        church,
      );
      setError(result.error);
      if (!result.error) {
        setDirty(false);
        setOpen(false);
        router.refresh();
      }
    });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        {trigger ?? <Button><Plus /> {t("planTpl.add")}</Button>}
      </SheetTrigger>

      <SheetContent
        width="640px"
        title={
          template
            ? t("planTpl.editTitle", { name: template.name })
            : picking
              ? t("planTpl.start")
              : t("planTpl.newTitle")
        }
        closeLabel={t("common.close")}
        footer={
          picking ? null : (
            <>
              {/* R11.8. Taking it off the list lives here rather than on the
                  tile, so the tile stays one thing to press. */}
              {template && onArchive ? (
                <IconButton
                  label={t("planTpl.archive")}
                  variant="ghost"
                  className="mr-auto"
                  disabled={pending || saving}
                  onClick={() => {
                    setOpen(false);
                    onArchive();
                  }}
                >
                  <Archive />
                </IconButton>
              ) : null}
              <Button
                type="button"
                disabled={pending || saving || !dirty}
                loading={saving}
                onClick={save}
              >
                {t("action.save")}
              </Button>
            </>
          )
        }
      >
        {guard}

        {picking ? (
          <LibraryPicker
            ownLabel={t("planTpl.ownTemplate")}
            items={library}
            onOwn={() => {
              setName("");
              setLines([]);
              setPicking(false);
            }}
            onPick={(item) => {
              const picked = library.find((one) => one.key === item.key);
              setName(item.label);
              setLines(picked?.lines ?? []);
              setDirty(true);
              setPicking(false);
            }}
          />
        ) : (
          <div className="flex flex-col gap-4">
            {error ? <Banner tone="danger" title={t("planTpl.failed")}>{error}</Banner> : null}

            {template || library.length === 0 ? null : (
              <button
                type="button"
                onClick={() => setPicking(true)}
                className="flex cursor-pointer items-center gap-1.5 self-start font-medium text-primary"
              >
                <ArrowLeft className="size-4" aria-hidden /> {t("fields.back")}
              </button>
            )}

            <Field label={t("planTpl.name")} required>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setDirty(true);
                }}
                placeholder={t("planTpl.namePlaceholder")}
                autoComplete="off"
                autoFocus
              />
            </Field>

            <Lines lines={lines} kinds={kinds} onChange={change} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/**
 * R11.8. The order of service, as a run of lines down the panel.
 *
 * The thread down the left is the same one the blackout dates and the library
 * wear, so a shape reads as a sequence rather than four stacked form rows. The
 * handle reorders it, because the order is the whole point of the record.
 */
function Lines({
  lines,
  kinds,
  onChange,
}: {
  lines: ShapeLine[];
  kinds: string[];
  onChange: (next: ShapeLine[]) => void;
}) {
  const [dragging, setDragging] = React.useState<number | null>(null);
  const [over, setOver] = React.useState<{ at: number; after: boolean } | null>(null);

  const edit = (at: number, patch: Partial<ShapeLine>) =>
    onChange(lines.map((line, i) => (i === at ? { ...line, ...patch } : line)));

  const drop = () => {
    const from = dragging;
    const target = over;
    setDragging(null);
    setOver(null);
    if (from === null || !target) return;

    const next = [...lines];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    const to = target.at - (target.at > from ? 1 : 0) + (target.after ? 1 : 0);
    next.splice(to, 0, moved);
    if (next.every((line, i) => line === lines[i])) return;
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-label text-fg">{t("planTpl.items")}</span>

      {lines.length === 0 ? (
        <p className="text-[13px] text-fg-muted">{t("planTpl.item.none")}</p>
      ) : (
        <ol className="m-0 flex list-none flex-col p-0">
          {lines.map((line, at) => (
            <li
              key={at}
              draggable
              onDragStart={(e) => {
                setDragging(at);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", String(at));
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
                  was?.at === at && was.after === after ? was : { at, after },
                );
              }}
              onDrop={(e) => {
                e.preventDefault();
                drop();
              }}
              className={cn(
                "flex gap-2.5",
                dragging === at && "opacity-40",
                over?.at === at && !over.after
                  && "shadow-[inset_0_2px_0_0_var(--color-primary)]",
                over?.at === at && over.after
                  && "shadow-[inset_0_-2px_0_0_var(--color-primary)]",
              )}
            >
              {/* The thread, with a mark against each line. */}
              <span className="flex w-5 shrink-0 flex-col items-center" aria-hidden>
                <span className="mt-4 size-2.5 shrink-0 rounded-full bg-primary" />
                {at === lines.length - 1 ? null : (
                  <span className="my-0.5 w-px flex-1 bg-primary/35" />
                )}
              </span>

              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 pb-3">
                <GripVertical
                  className="size-4 shrink-0 cursor-grab text-line-strong"
                  aria-hidden
                />

                <Select value={line.kind} onValueChange={(kind) => edit(at, { kind })}>
                  <SelectTrigger className="w-[140px]" aria-label={t("planTpl.item.kind")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {kinds.map((kind) => (
                      <SelectItem key={kind} value={kind}>
                        {t(`order.kind.${kind}` as never)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  className="min-w-[140px] flex-1"
                  value={line.title}
                  aria-label={t("planTpl.item.title")}
                  autoComplete="off"
                  onChange={(e) => edit(at, { title: e.target.value })}
                />

                <Input
                  className="w-[72px]"
                  value={String(line.minutes)}
                  inputMode="numeric"
                  aria-label={t("planTpl.item.minutes")}
                  onChange={(e) =>
                    edit(at, { minutes: Math.min(600, Number(e.target.value.replace(/\D/g, "")) || 0) })
                  }
                />

                <IconButton
                  label={t("planTpl.item.remove")}
                  variant="ghost"
                  onClick={() => onChange(lines.filter((_, i) => i !== at))}
                >
                  <Trash2 />
                </IconButton>
              </div>
            </li>
          ))}
        </ol>
      )}

      <button
        type="button"
        onClick={() => onChange([...lines, { kind: "song", title: "", minutes: 5 }])}
        className="flex cursor-pointer items-center gap-1.5 self-start rounded-md px-2 py-1.5 font-medium text-primary"
      >
        <Plus className="size-4" aria-hidden /> {t("planTpl.item.add")}
      </button>

      {lines.length > 0 ? (
        <span className="text-[13px] text-fg-muted">{summary(lines)}</span>
      ) : null}
    </div>
  );
}

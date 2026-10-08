"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Archive, Undo2, Tablet } from "lucide-react";
import {
  Banner, Button, IconButton, Field, Input, cn,
  Dialog, DialogTrigger, DialogContent, DialogFooter,
  Sheet, SheetTrigger, SheetContent,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { usePanelGuard } from "@/components/panel-guard";
import { useAnswered } from "@/components/form-actions";
import { Empty } from "@/components/empty";
import { createStation, saveStation, archiveStation } from "./actions";

const MODES = ["desk", "kiosk"] as const;
const PRINTERS = ["paper", "brother", "dymo"] as const;

export interface StationItem {
  id: string;
  name: string;
  mode: string;
  printer: string;
  archived: boolean;
}

/**
 * R8.1, R8.2. The devices a church checks members in on.
 *
 * Three questions: what it is called, whether a volunteer runs it or a family
 * does, and what prints the labels. A device is then pointed at it, so the
 * tablet that dies minutes before a service is replaced by pointing another one at
 * the same station.
 */
export function StationManager({
  church,
  stations,
  putAway,
}: {
  church: string;
  stations: StationItem[];
  /** R24.6. Whether this is the shelf of stations that have been put away. */
  putAway?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const act = (fn: (d: FormData) => Promise<{ error?: string }>, fields: Record<string, string>) => {
    const data = new FormData();
    data.set("church", church);
    for (const [k, v] of Object.entries(fields)) data.set(k, v);
    startTransition(async () => {
      const result = await fn(data);
      setError(result.error);
      if (!result.error) router.refresh();
    });
  };

  const open = stations;

  const setMode = (station: StationItem, mode: string) =>
    act(saveStation, {
      id: station.id,
      name: station.name,
      printer: station.printer,
      mode,
    });

  if (putAway) {
    return (
      <div className="flex flex-col gap-5" aria-busy={pending}>
        {error ? <Banner tone="danger" title={t("stations.failed")}>{error}</Banner> : null}

        {stations.length === 0 ? (
          <Empty icon="station" title={t("stations.archived.none")} />
        ) : (
          <section className="rounded-[14px] border border-line bg-surface px-5 py-1">
            {stations.map((station) => (
              <div
                key={station.id}
                className="flex items-center gap-3 border-b border-sunken py-2.5 last:border-0"
              >
                <span className="flex-1 text-fg-subtle">{station.name}</span>
                <IconButton
                  label={t("stations.restore")}
                  variant="ghost"
                  disabled={pending}
                  onClick={() => act(archiveStation, { id: station.id, archived: "0" })}
                >
                  <Undo2 />
                </IconButton>
              </div>
            ))}
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("stations.failed")}>{error}</Banner> : null}

      {open.length > 0 ? (
        <div className="flex justify-end">
          <StationDialog
            pending={pending}
            title={t("stations.add")}
            trigger={<Button><Plus /> {t("stations.add")}</Button>}
            onSave={(fields) => act(createStation, fields)}
          />
        </div>
      ) : null}

      {open.length === 0 ? (
        <Empty
          icon="station"
          title={t("stations.none.title")}
          body={t("stations.none.body")}
          action={
            <StationDialog
              pending={pending}
              title={t("stations.add")}
              trigger={<Button><Plus /> {t("stations.add")}</Button>}
              onSave={(fields) => act(createStation, fields)}
            />
          }
        />
      ) : (
        <section className="rounded-[14px] border border-line bg-surface px-5 py-1">
          {open.map((station) => (
            <div
              key={station.id}
              className="relative flex flex-wrap items-center gap-3 border-b border-sunken py-3 last:border-0"
            >
              {/* R24.6. The whole row opens the station. The trigger is a layer
                  over it rather than a wrapper around it, so the mode switch
                  stays a control instead of a control inside a control. */}
              <StationDialog
                station={station}
                pending={pending}
                title={t("stations.editTitle", { name: station.name })}
                trigger={
                  <button
                    type="button"
                    aria-label={t("stations.editTitle", { name: station.name })}
                    className="absolute inset-0 cursor-pointer rounded-md"
                  />
                }
                onSave={(fields) => act(saveStation, { id: station.id, ...fields })}
              />

              <span className="pointer-events-none relative grid size-9 shrink-0 place-items-center rounded-[10px] bg-sunken text-fg-muted">
                <Tablet className="size-[18px]" aria-hidden />
              </span>

              <span className="pointer-events-none relative flex min-w-0 flex-[1_1_180px] flex-col leading-[18px]">
                <span className="truncate font-medium text-fg">{station.name}</span>
                <span className="truncate text-[12px] text-fg-subtle">
                  {station.printer === "paper"
                    ? t("stations.noPrinter")
                    : t(`stations.printer.${station.printer}` as never)}
                </span>
              </span>

              {/* R8.1. The one thing a church flips between services: whether a
                  volunteer is standing at it or a family uses it themselves. */}
              <div className="relative flex gap-0.5 rounded-[10px] bg-sunken p-[3px]">
                {MODES.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={station.mode === mode}
                    disabled={pending}
                    onClick={() => setMode(station, mode)}
                    className={cn(
                      "h-8 cursor-pointer rounded-[7px] px-3 text-label font-medium",
                      station.mode === mode
                        ? "bg-surface text-fg shadow-sm"
                        : "text-fg-muted hover:text-fg",
                    )}
                  >
                    {t(`stations.mode.${mode}` as never)}
                  </button>
                ))}
              </div>

              <span className="relative">
                <ArchiveDialog
                  station={station}
                  pending={pending}
                  onConfirm={() => act(archiveStation, { id: station.id, archived: "1" })}
                />
              </span>
            </div>
          ))}
        </section>
      )}

    </div>
  );
}

function StationDialog({
  station,
  pending,
  title,
  trigger,
  onSave,
}: {
  station?: StationItem;
  pending: boolean;
  title: string;
  trigger: React.ReactNode;
  onSave: (fields: Record<string, string>) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState(station?.mode ?? "desk");
  const [printer, setPrinter] = React.useState(station?.printer ?? "paper");

  const formId = React.useId();
  const [dirty, setDirty] = React.useState(false);
  const full = useAnswered(formId, open);

  /*
   * One Add panel serves every new station, so the two Selects go back to the
   * station being described rather than keeping the last one's answers: a
   * device left on the wrong mode behaves differently at check-in.
   */
  const close = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setMode(station?.mode ?? "desk");
      setPrinter(station?.printer ?? "paper");
      setDirty(false);
    }
  };
  const { onOpenChange, guard } = usePanelGuard({ dirty, setOpen: close });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        title={title}
        closeLabel={t("common.close")}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => close(false)}>
              {t("action.cancel")}
            </Button>
            <Button type="submit" form={formId} disabled={pending || !dirty || !full}>
              {t("action.save")}
            </Button>
          </>
        }
      >
        {guard}

        <form
          id={formId}
          onInput={() => setDirty(true)}
          action={(data) => {
            onSave({
              name: String(data.get("name") ?? ""),
              mode,
              printer,
            });
            close(false);
          }}
          noValidate
          className="flex flex-col gap-4"
        >
          <Field label={t("stations.name")} required>
            <Input name="name" defaultValue={station?.name ?? ""} autoComplete="off" />
          </Field>

          <div className="flex flex-wrap gap-4">
            <div className="flex min-w-48 flex-1 flex-col gap-1.5">
              <span className="text-label text-fg">{t("stations.mode")}</span>
              <Select value={mode} onValueChange={(next) => { setMode(next); setDirty(true); }}>
                <SelectTrigger aria-label={t("stations.mode")}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(`stations.mode.${option}` as never)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex min-w-48 flex-1 flex-col gap-1.5">
              <span className="text-label text-fg">{t("stations.printer")}</span>
              <Select value={printer} onValueChange={(next) => { setPrinter(next); setDirty(true); }}>
                <SelectTrigger aria-label={t("stations.printer")}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRINTERS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(`stations.printer.${option}` as never)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

        </form>
      </SheetContent>
    </Sheet>
  );
}

function ArchiveDialog({
  station,
  pending,
  onConfirm,
}: {
  station: StationItem;
  pending: boolean;
  onConfirm: () => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <IconButton
          label={t("stations.archive")}
          variant="ghost"
        >
          <Archive />
        </IconButton>
      </DialogTrigger>
      <DialogContent alert title={t("stations.archiveTitle", { name: station.name })}>
        <p className="mb-5 text-[length:var(--d-text-body)] text-fg-muted">
          {t("stations.archiveBody")}
        </p>
        <DialogFooter>
          <Button variant="ghost" data-dismiss onClick={() => setOpen(false)}>
            {t("stations.keep")}
          </Button>
          <Button variant="danger" disabled={pending} onClick={() => { onConfirm(); setOpen(false); }}>
            <Archive /> {t("stations.archiveAction", { name: station.name })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

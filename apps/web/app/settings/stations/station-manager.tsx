"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Archive, Undo2 } from "lucide-react";
import {
  Badge, Banner, Button, Card, EmptyState, Field, Input, Separator,
  Dialog, DialogTrigger, DialogContent, DialogFooter,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
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
 * R8.1, R8.2. The devices a church checks people in on.
 *
 * Three questions: what it is called, whether a volunteer runs it or a family
 * does, and what prints the labels. A device is then pointed at it, so the
 * tablet that dies at 09:40 on a Sunday is replaced by pointing another one at
 * the same station.
 */
export function StationManager({
  church,
  stations,
}: {
  church: string;
  stations: StationItem[];
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

  const open = stations.filter((s) => !s.archived);
  const archived = stations.filter((s) => s.archived);

  return (
    <div className="flex flex-col gap-6" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("stations.failed")}>{error}</Banner> : null}

      <div>
        <StationDialog
          pending={pending}
          title={t("stations.add")}
          trigger={<Button><Plus /> {t("stations.add")}</Button>}
          onSave={(fields) => act(createStation, fields)}
        />
      </div>

      {open.length === 0 ? (
        <EmptyState title={t("stations.none.title")} body={t("stations.none.body")} />
      ) : (
        <Card>
          <ul className="flex flex-col">
            {open.map((station, i) => (
              <li key={station.id}>
                {i > 0 ? <Separator className="my-3" /> : null}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[length:var(--d-text-body)] text-fg">{station.name}</span>
                      <Badge tone="neutral">{t(`stations.mode.${station.mode}` as never)}</Badge>
                      <Badge tone="neutral">{t(`stations.printer.${station.printer}` as never)}</Badge>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                    <StationDialog
                      station={station}
                      pending={pending}
                      title={t("stations.editTitle", { name: station.name })}
                      trigger={<Button variant="ghost"><Pencil /> {t("stations.edit")}</Button>}
                      onSave={(fields) => act(saveStation, { id: station.id, ...fields })}
                    />
                    <ArchiveDialog
                      station={station}
                      pending={pending}
                      onConfirm={() => act(archiveStation, { id: station.id, archived: "1" })}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {archived.length === 0 ? null : (
        <Card>
          <h2 className="mb-3 text-title text-fg">{t("stations.archived")}</h2>
          <ul className="flex flex-col">
            {archived.map((station, i) => (
              <li key={station.id}>
                {i > 0 ? <Separator className="my-3" /> : null}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[length:var(--d-text-body)] text-fg-subtle">{station.name}</span>
                  <Button
                    variant="ghost"
                    disabled={pending}
                    onClick={() => act(archiveStation, { id: station.id, archived: "0" })}
                  >
                    <Undo2 /> {t("stations.restore")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={title} closeLabel={t("common.close")}>
        <form
          action={(data) => {
            onSave({
              name: String(data.get("name") ?? ""),
              mode,
              printer,
            });
            setOpen(false);
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
              <Select value={mode} onValueChange={setMode}>
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
              <Select value={printer} onValueChange={setPrinter}>
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

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={pending}>{t("action.save")}</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("action.cancel")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
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
        <Button variant="ghost"><Archive /> {t("stations.archive")}</Button>
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

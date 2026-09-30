"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Archive, Undo2 } from "lucide-react";
import {
  Badge, Banner, Button, Card, Checkbox, EmptyState, Field, HueDot, Input, Separator,
  Dialog, DialogTrigger, DialogContent,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  type Hue,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { createStation, saveStation, archiveStation } from "./actions";

const MODES = ["manned", "kiosk", "roaming", "phone"] as const;
const PRINTERS = ["paper", "brother", "dymo"] as const;

export interface StationItem {
  id: string;
  name: string;
  mode: string;
  printer: string;
  roomIds: string[];
  serviceTimeIds: string[];
  archived: boolean;
}

export interface RoomOption {
  id: string;
  name: string;
  hue: string;
}

export interface ServiceOption {
  id: string;
  name: string;
}

/**
 * R8.1, R8.2. The devices a church checks people in on.
 *
 * A station is configured here and a device is pointed at it, so the tablet
 * that dies at 09:40 on a Sunday is replaced by pointing another one at the
 * same station.
 */
export function StationManager({
  church,
  stations,
  rooms,
  services,
}: {
  church: string;
  stations: StationItem[];
  rooms: RoomOption[];
  services: ServiceOption[];
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

  const summary = (station: StationItem): string =>
    station.roomIds.length === 0
      ? t("stations.allRooms")
      : rooms
          .filter((r) => station.roomIds.includes(r.id))
          .map((r) => r.name)
          .join(", ");

  return (
    <div className="flex flex-col gap-6" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("stations.title")}>{error}</Banner> : null}

      <div>
        <StationDialog
          rooms={rooms}
          services={services}
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
                    <div className="text-caption text-fg-muted">{summary(station)}</div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                    <StationDialog
                      station={station}
                      rooms={rooms}
                      services={services}
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
  rooms,
  services,
  pending,
  title,
  trigger,
  onSave,
}: {
  station?: StationItem;
  rooms: RoomOption[];
  services: ServiceOption[];
  pending: boolean;
  title: string;
  trigger: React.ReactNode;
  onSave: (fields: Record<string, string>) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState(station?.mode ?? "manned");
  const [printer, setPrinter] = React.useState(station?.printer ?? "paper");
  const [roomIds, setRoomIds] = React.useState<string[]>(station?.roomIds ?? []);
  const [serviceIds, setServiceIds] = React.useState<string[]>(station?.serviceTimeIds ?? []);

  const toggle = (
    list: string[],
    set: (next: string[]) => void,
    id: string,
    on: boolean,
  ) => set(on ? [...list, id] : list.filter((x) => x !== id));

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
              roomIds: roomIds.join(","),
              serviceTimeIds: serviceIds.join(","),
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

          {/* Nothing ticked is every room and every service, which is what a
              church with one desk wants and never has to think about. */}
          <Picker
            label={t("stations.rooms")}
            options={rooms.map((r) => ({
              id: r.id,
              label: r.name,
              icon: <HueDot hue={r.hue as Hue} />,
            }))}
            chosen={roomIds}
            onToggle={(id, on) => toggle(roomIds, setRoomIds, id, on)}
          />

          <Picker
            label={t("stations.services")}
            options={services.map((s) => ({ id: s.id, label: s.name }))}
            chosen={serviceIds}
            onToggle={(id, on) => toggle(serviceIds, setServiceIds, id, on)}
          />

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

function Picker({
  label,
  options,
  chosen,
  onToggle,
}: {
  label: string;
  options: { id: string; label: string; icon?: React.ReactNode }[];
  chosen: string[];
  onToggle: (id: string, on: boolean) => void;
}) {
  if (options.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-label text-fg">{label}</span>
      <div className="flex flex-col gap-2">
        {options.map((option) => (
          <label
            key={option.id}
            className="flex cursor-pointer items-center gap-2 text-[length:var(--d-text-body)] text-fg"
          >
            <Checkbox
              checked={chosen.includes(option.id)}
              onCheckedChange={(on) => onToggle(option.id, on === true)}
            />
            {option.icon}
            {option.label}
          </label>
        ))}
      </div>
    </div>
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
      <DialogContent title={t("stations.archiveTitle", { name: station.name })} closeLabel={t("common.close")}>
        <p className="mb-5 text-[length:var(--d-text-body)] text-fg-muted">
          {t("stations.archiveBody")}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="danger" disabled={pending} onClick={() => { onConfirm(); setOpen(false); }}>
            {t("stations.archive")}
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>{t("action.cancel")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

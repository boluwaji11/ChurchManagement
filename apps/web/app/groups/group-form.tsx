"use client";

import * as React from "react";
import {useRouter } from "next/navigation";
import { Archive } from "lucide-react";
import {
  Banner,
  Button, Checkbox, Field, HueDot, Input, Textarea,
  Dialog, DialogTrigger, DialogContent, DialogFooter,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  type Hue,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { TimeField } from "@/components/time-field";
import { create, save } from "./actions";

export interface GroupTypeOption {
  id: string;
  name: string;
  hue: string;
}

/** The fields the form writes, which is every field a group has. */
export interface GroupDraft {
  id: string;
  name: string;
  description: string | null;
  typeId: string | null;
  dayOfWeek: number | null;
  startsAt: string | null;
  endsAt: string | null;
  frequency: string | null;
  location: string | null;
  address: string | null;
  capacity: number | null;
  forWhom: string | null;
  online: boolean;
  childrenWelcome: boolean;
  openToJoin: boolean;
  listed: boolean;
}

const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;
const FREQUENCIES = ["weekly", "fortnightly", "monthly"] as const;
const AUDIENCES = [
  "anyone", "men", "women", "young_adults", "students", "parents", "seniors",
] as const;

/** "Tuesday", from the browser's own idea of the week. */
const dayName = (day: number) => {
  const d = new Date(2024, 0, 7 + day);
  return d.toLocaleDateString(undefined, { weekday: "long" });
};

/**
 * R9.1, R9.2. Writing a group down, and taking it off the lists.
 *
 * One form for creating and for editing, because a church that can say when a
 * group meets on the way in should be able to change it in the same words.
 */
export function GroupDialog({
  church,
  types,
  group,
  pending,
  title,
  trigger,
}: {
  church: string;
  types: GroupTypeOption[];
  group?: GroupDraft;
  pending: boolean;
  title: string;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [typeId, setTypeId] = React.useState(group?.typeId ?? "");
  const [day, setDay] = React.useState(group?.dayOfWeek === null || group?.dayOfWeek === undefined ? "" : String(group.dayOfWeek));
  const [frequency, setFrequency] = React.useState(group?.frequency ?? "");
  const [forWhom, setForWhom] = React.useState(group?.forWhom ?? "");
  const [online, setOnline] = React.useState(group?.online ?? false);
  const [childrenWelcome, setChildrenWelcome] = React.useState(group?.childrenWelcome ?? false);
  const [openToJoin, setOpenToJoin] = React.useState(group?.openToJoin ?? true);
  const [listed, setListed] = React.useState(group?.listed ?? true);
  const [saving, startTransition] = React.useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={title} closeLabel={t("common.close")}>
        <form
          noValidate
          action={(data) => {
            data.set("church", church);
            data.set("typeId", typeId);
            data.set("dayOfWeek", day);
            data.set("frequency", frequency);
            data.set("forWhom", forWhom);
            if (group) data.set("id", group.id);
            startTransition(async () => {
              const result = await (group ? save(data) : create(data));
              setError(result.error);
              if (!result.error) {
                setOpen(false);
                router.refresh();
              }
            });
          }}
          className="flex flex-col gap-4"
        >
          {error ? (
            <Banner tone="danger" title={t("groups.failed")}>{error}</Banner>
          ) : null}

          <Field label={t("groups.name")} required>
            <Input name="name" defaultValue={group?.name ?? ""} autoComplete="off" autoFocus />
          </Field>

          <Field label={t("groups.description")}>
            <Textarea name="description" rows={2} defaultValue={group?.description ?? ""} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <span className="text-label text-fg">{t("groups.type")}</span>
              <Select value={typeId} onValueChange={setTypeId}>
                <SelectTrigger aria-label={t("groups.type")}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {types.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <span className="flex items-center gap-2">
                        <HueDot hue={type.hue as Hue} />
                        {type.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Field label={t("groups.location")}>
              <Input name="location" defaultValue={group?.location ?? ""} autoComplete="off" />
            </Field>

            <Field label={t("groups.address")}>
              <Input name="address" defaultValue={group?.address ?? ""} autoComplete="off" />
            </Field>

            <div className="flex flex-col gap-1.5">
              <span className="text-label text-fg">{t("groups.day")}</span>
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger aria-label={t("groups.day")}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => (
                    <SelectItem key={d} value={String(d)}>{dayName(d)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Field label={t("groups.time")}>
              <TimeField name="startsAt" defaultValue={group?.startsAt ?? ""} />
            </Field>

            <Field label={t("groups.endsAt")}>
              <TimeField name="endsAt" defaultValue={group?.endsAt ?? ""} />
            </Field>

            <div className="flex flex-col gap-1.5">
              <span className="text-label text-fg">{t("groups.forWhom")}</span>
              <Select value={forWhom} onValueChange={setForWhom}>
                <SelectTrigger aria-label={t("groups.forWhom")}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUDIENCES.map((a) => (
                    <SelectItem key={a} value={a}>{t(`groups.audience.${a}` as never)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-label text-fg">{t("groups.frequency")}</span>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger aria-label={t("groups.frequency")}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f} value={f}>{t(`groups.frequency.${f}` as never)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Field label={t("groups.capacity")}>
              <Input
                name="capacity"
                inputMode="numeric"
                defaultValue={group?.capacity === null || group?.capacity === undefined ? "" : String(group.capacity)}
              />
            </Field>
          </div>

          <label className="flex cursor-pointer items-center gap-3">
            <Checkbox
              name="online"
              checked={online}
              onCheckedChange={(on) => setOnline(on === true)}
            />
            <span className="text-[length:var(--d-text-body)] text-fg">{t("groups.online")}</span>
          </label>

          <label className="flex cursor-pointer items-center gap-3">
            <Checkbox
              name="childrenWelcome"
              checked={childrenWelcome}
              onCheckedChange={(on) => setChildrenWelcome(on === true)}
            />
            <span className="text-[length:var(--d-text-body)] text-fg">
              {t("groups.childrenWelcome")}
            </span>
          </label>

          <label className="flex cursor-pointer items-center gap-3">
            <Checkbox
              name="openToJoin"
              checked={openToJoin}
              onCheckedChange={(on) => setOpenToJoin(on === true)}
            />
            <span className="text-[length:var(--d-text-body)] text-fg">{t("groups.openToJoin")}</span>
          </label>

          <label className="flex cursor-pointer items-center gap-3">
            <Checkbox
              name="listed"
              checked={listed}
              onCheckedChange={(on) => setListed(on === true)}
            />
            <span className="text-[length:var(--d-text-body)] text-fg">{t("groups.listed")}</span>
          </label>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("action.cancel")}
            </Button>
              <Button type="submit" disabled={pending || saving}>{t("action.save")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ArchiveDialog({
  name,
  pending,
  onConfirm,
}: {
  name: string;
  pending: boolean;
  onConfirm: () => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost"><Archive /> {t("groups.archive")}</Button>
      </DialogTrigger>
      <DialogContent alert title={t("groups.archiveTitle", { name })}>
        <div className="flex flex-col gap-4">
          <p className="text-[length:var(--d-text-body)] text-fg">{t("groups.archiveBody")}</p>
          <DialogFooter>
            <Button variant="ghost" data-dismiss onClick={() => setOpen(false)}>
              {t("groups.keep")}
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                setOpen(false);
                onConfirm();
              }}
            >
              <Archive /> {t("groups.archiveAction", { name })}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

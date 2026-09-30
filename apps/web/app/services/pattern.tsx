"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import {
  Banner, Button, Card, CardTitle, Field, Input, Separator,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { TimeField } from "@/components/time-field";
import { addService, removeService } from "../settings/actions";

export interface PatternRow {
  id: string;
  name: string;
  dayOfWeek: number;
  startsAt: string;
}

const DAYS = [0, 1, 2, 3, 4, 5, 6];

const clock = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
};

/**
 * R1.1 and R7.1. When the church meets, week to week.
 *
 * It sits here rather than in the church settings because the pattern and the
 * calendar it produces are one job. Setting up attendance used to mean finding
 * a settings tab, adding a service time, coming back, and filling the calendar.
 * That is four hours a week somebody does not have.
 */
export function WeeklyPattern({
  church,
  rows,
  canEdit,
}: {
  church: string;
  rows: PatternRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [day, setDay] = React.useState("0");
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();
  const form = React.useRef<HTMLFormElement>(null);

  const add = (data: FormData) => {
    data.set("church", church);
    data.set("dayOfWeek", day);
    startTransition(async () => {
      const result = await addService(data);
      setError(result.error);
      if (!result.error) {
        form.current?.reset();
        router.refresh();
      }
    });
  };

  const drop = (id: string) => {
    const data = new FormData();
    data.set("church", church);
    data.set("id", id);
    startTransition(async () => {
      const result = await removeService(data);
      setError(result.error);
      if (!result.error) router.refresh();
    });
  };

  return (
    <Card aria-busy={pending}>
      <CardTitle>{t("pattern.title")}</CardTitle>
      <Separator className="my-4" />

      {error ? <Banner tone="danger" title={t("pattern.title")} className="mb-4">{error}</Banner> : null}

      <ul className="mb-4 flex flex-wrap gap-2">
        {rows.length === 0 ? (
          <li className="text-[length:var(--d-text-body)] text-fg-muted">{t("pattern.none")}</li>
        ) : null}

        {rows.map((row) => (
          <li
            key={row.id}
            className="flex items-center gap-3 rounded-lg border border-line bg-canvas py-1.5 pl-3 pr-1.5"
          >
            <span className="text-[length:var(--d-text-body)] text-fg">{row.name}</span>
            <span className="text-caption text-fg-muted">
              {t(`day.${row.dayOfWeek}` as never)} {clock(row.startsAt)}
            </span>
            {canEdit ? (
              <Button variant="ghost" onClick={() => drop(row.id)} aria-label={t("pattern.remove")}>
                <X />
              </Button>
            ) : null}
          </li>
        ))}
      </ul>

      {canEdit ? (
        <form ref={form} action={add} noValidate className="flex flex-wrap items-end gap-3">
          <Field label={t("pattern.name")} className="min-w-48 flex-1">
            <Input name="name" autoComplete="off" />
          </Field>

          <div className="flex min-w-40 flex-col gap-1.5">
            <span className="text-label text-fg">{t("pattern.day")}</span>
            <Select value={day} onValueChange={setDay}>
              <SelectTrigger aria-label={t("pattern.day")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((d) => (
                  <SelectItem key={d} value={String(d)}>{t(`day.${d}` as never)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Field label={t("pattern.startsAt")} className="max-w-40">
            <TimeField name="startsAt" />
          </Field>

          <Button type="submit" disabled={pending}>
            <Plus /> {t("action.add")}
          </Button>
        </form>
      ) : null}
    </Card>
  );
}

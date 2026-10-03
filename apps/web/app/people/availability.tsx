"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import {
  Banner, Button, Field, IconButton, Input, Separator,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { DateField } from "@/components/date-field";
import type { ServingFrequency } from "@hearth/db";
import { saveBlockout, dropBlockout, saveFrequency } from "../serving/actions";

export interface AwayRange {
  id: string;
  startsOn: string;
  endsOn: string;
  reason: string | null;
}

const FREQUENCIES = ["weekly", "fortnightly", "monthly", "quarterly"] as const;
const NONE = "none";

/**
 * R10.4, R10.5. What this person has said about serving: how often, and when
 * they are away.
 *
 * Both are shown to whoever builds a schedule as a warning rather than a rule. A
 * leader who has already spoken to somebody can put them down anyway.
 */
export function Availability({
  church,
  personId,
  frequency,
  away,
  canEdit,
}: {
  church: string;
  personId: string;
  frequency: ServingFrequency | null;
  away: AwayRange[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [adding, setAdding] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const run = (work: () => Promise<{ error?: string }>) => {
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      if (!result.error) router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-4" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("serving.failed")}>{error}</Banner> : null}

      <div className="flex flex-col gap-1.5">
        <span className="text-label text-fg">{t("availability.frequency")}</span>
        <Select
          value={frequency ?? NONE}
          disabled={!canEdit}
          onValueChange={(value) =>
            run(() =>
              saveFrequency(personId, value === NONE ? null : (value as ServingFrequency), church))}
        >
          <SelectTrigger aria-label={t("availability.frequency")} className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>{t("availability.frequency.none")}</SelectItem>
            {FREQUENCIES.map((option) => (
              <SelectItem key={option} value={option}>
                {t(`frequency.${option}` as never)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-label text-fg">{t("availability.away")}</span>

        {away.length === 0 ? (
          <span className="text-[length:var(--d-text-body)] text-fg-muted">
            {t("availability.empty")}
          </span>
        ) : (
          <ul className="flex flex-col">
            {away.map((range, i) => (
              <li key={range.id}>
                {i > 0 ? <Separator className="my-2" /> : null}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex flex-wrap items-center gap-3">
                    <span className="text-[length:var(--d-text-body)] text-fg tabular-nums">
                      {range.startsOn} {range.endsOn}
                    </span>
                    {range.reason ? (
                      <span className="text-caption text-fg-muted">{range.reason}</span>
                    ) : null}
                  </span>
                  {canEdit ? (
                    <IconButton
                      label={t("availability.remove")}
                      disabled={pending}
                      onClick={() => run(() => dropBlockout(range.id, church))}
                    >
                      <X />
                    </IconButton>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        {canEdit && !adding ? (
          <div>
            <Button variant="secondary" onClick={() => setAdding(true)}>
              <Plus /> {t("availability.add")}
            </Button>
          </div>
        ) : null}

        {canEdit && adding ? (
          <form
            noValidate
            action={(data) => {
              data.set("church", church);
              data.set("personId", personId);
              startTransition(async () => {
                const result = await saveBlockout(data);
                setError(result.error);
                if (!result.error) {
                  setAdding(false);
                  router.refresh();
                }
              });
            }}
            className="flex flex-col gap-3"
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={t("availability.from")} required>
                <DateField name="startsOn" />
              </Field>
              <Field label={t("availability.to")} required>
                <DateField name="endsOn" />
              </Field>
              <Field label={t("availability.reason")}>
                <Input name="reason" autoComplete="off" />
              </Field>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={pending}>{t("action.save")}</Button>
              <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                {t("action.cancel")}
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  Badge, Banner, Button, Field, Input, Separator,
  Dialog, DialogTrigger, DialogContent,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { DateField } from "@/components/date-field";
import { addCheck } from "./check-actions";

export interface CheckRow {
  id: string;
  provider: string | null;
  status: string;
  completedOn: string | null;
  expiresOn: string | null;
}

const RESULTS = ["pending", "clear", "flagged"] as const;

const readable = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric", month: "long", year: "numeric",
  });

const TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  clear: "success",
  expiring: "warning",
  expired: "danger",
  flagged: "danger",
  pending: "neutral",
  none: "neutral",
};

/**
 * R2.10, R21.11. Where somebody stands, and how they got there.
 *
 * Status only. What the provider found is the provider's record, and a church
 * that needs to know goes and looks it up there. Nothing here can be edited or
 * removed: a new check supersedes an old one, because what the church knew in
 * 2024 has to stay answerable later.
 */
export function Checks({
  church,
  personId,
  standing,
  expiresOn,
  rows,
  canEdit,
}: {
  church: string;
  personId: string;
  standing: string;
  expiresOn: string | null;
  rows: CheckRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending] = React.useTransition();

  return (
    <div className="flex flex-col gap-4" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("checks.title")}>{error}</Banner> : null}

      <span className="flex flex-wrap items-center gap-2">
        <Badge tone={TONE[standing] ?? "neutral"}>
          {t(`checks.standing.${standing}` as never)}
        </Badge>
        {expiresOn && standing !== "none" ? (
          <span className="text-caption text-fg-muted">
            {t("checks.until", { day: readable(expiresOn) })}
          </span>
        ) : null}
      </span>

      {rows.length > 0 ? (
        <ul className="flex flex-col">
          {rows.map((row, i) => (
            <li key={row.id}>
              {i > 0 ? <Separator className="my-2" /> : null}
              <span className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[length:var(--d-text-body)] text-fg">
                  {row.provider ?? t("checks.provider")}
                </span>
                <span className="text-caption text-fg-muted">
                  {t(`checks.result.${row.status}` as never)}
                  {row.completedOn ? ` ${readable(row.completedOn)}` : ""}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {canEdit ? (
        <div>
          <AddDialog
            church={church}
            personId={personId}
            pending={pending}
            onDone={() => router.refresh()}
            onError={setError}
          />
        </div>
      ) : null}
    </div>
  );
}

function AddDialog({
  church,
  personId,
  pending,
  onDone,
  onError,
}: {
  church: string;
  personId: string;
  pending: boolean;
  onDone: () => void;
  onError: (error?: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [status, setStatus] = React.useState("clear");
  const [saving, startTransition] = React.useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary"><Plus /> {t("checks.add")}</Button>
      </DialogTrigger>
      <DialogContent title={t("checks.add")} closeLabel={t("common.close")}>
        <form
          noValidate
          action={(data) => {
            data.set("church", church);
            data.set("personId", personId);
            data.set("status", status);
            startTransition(async () => {
              const result = await addCheck(data);
              onError(result.error);
              if (!result.error) {
                setOpen(false);
                onDone();
              }
            });
          }}
          className="flex flex-col gap-4"
        >
          <Field label={t("checks.provider")}>
            <Input name="provider" autoComplete="off" autoFocus />
          </Field>

          <div className="flex flex-col gap-1.5">
            <span className="text-label text-fg">{t("checks.result")}</span>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger aria-label={t("checks.result")}><SelectValue /></SelectTrigger>
              <SelectContent>
                {RESULTS.map((result) => (
                  <SelectItem key={result} value={result}>
                    {t(`checks.result.${result}` as never)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Field label={t("checks.completedOn")}>
            <DateField name="completedOn" />
          </Field>

          <Field label={t("checks.expiresOn")}>
            <DateField name="expiresOn" />
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={pending || saving}>{t("action.save")}</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("action.cancel")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

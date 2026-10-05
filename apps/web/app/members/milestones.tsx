"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import {
  Badge, Banner, Button, IconButton, Input, Dialog, DialogTrigger, DialogContent,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@hearth/ui";
import { DateField } from "@/components/date-field";
import { t } from "@hearth/i18n";
import { addPersonMilestone, removePersonMilestone } from "./milestone-actions";

export interface MilestoneRow {
  id: string;
  kind: string;
  occurredOn: string;
  notes: string | null;
}

const KINDS = [
  "first_visit", "salvation", "baptism", "confirmation",
  "child_dedication", "membership_class", "marriage", "death",
] as const;

const label = (kind: string) => t(`milestone.kind.${kind}` as never);

/** The browser refuses a later date itself, so the picker greys them out. */
const TODAY = new Date().toISOString().slice(0, 10);

const readable = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric", month: "long", year: "numeric",
  });

/** R2.6. The dates a church is asked for and cannot produce. */
export function Milestones({
  church,
  personId,
  rows,
  canEdit,
}: {
  church: string;
  personId: string;
  rows: MilestoneRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = React.useState(false);
  const [kind, setKind] = React.useState("");
  const [error, setError] = React.useState<string>();
  const [followed, setFollowed] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();
  const form = React.useRef<HTMLFormElement>(null);

  const submit = (data: FormData) => {
    data.set("church", church);
    data.set("personId", personId);
    data.set("kind", kind);

    startTransition(async () => {
      const result = await addPersonMilestone(data);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(undefined);
      setFollowed(
        result.updatedPerson
          ? result.kind === "death"
            ? t("milestone.deceased")
            : t("milestone.firstVisitSet")
          : undefined,
      );
      setAdding(false);
      setKind("");
      form.current?.reset();
      router.refresh();
    });
  };

  const remove = (id: string) => {
    const data = new FormData();
    data.set("church", church);
    data.set("personId", personId);
    data.set("id", id);

    startTransition(async () => {
      const result = await removePersonMilestone(data);
      if (result.error) setError(result.error);
      else {
        setError(undefined);
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-col gap-3" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("milestone.failed")}>{error}</Banner> : null}
      {followed ? <Banner tone="info" title={followed} /> : null}

      <ul className="flex flex-col gap-2">
        {rows.length === 0 ? (
          <li className="text-[length:var(--d-text-body)] text-fg-muted">{t("milestone.none")}</li>
        ) : null}

        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-canvas p-2.5"
          >
            <Badge tone="primary">{label(row.kind)}</Badge>
            <span className="text-[length:var(--d-text-body)] text-fg">
              {readable(row.occurredOn)}
            </span>
            {row.notes ? (
              <span className="text-caption text-fg-muted">{row.notes}</span>
            ) : null}
            {canEdit ? (
              <IconButton
                label={t("milestone.remove")}
                variant="ghost"
                className="ml-auto"
                onClick={() => remove(row.id)}
              >
                <X />
              </IconButton>
            ) : null}
          </li>
        ))}
      </ul>

      {canEdit ? (
        <Dialog open={adding} onOpenChange={(next) => { setAdding(next); if (next) setFollowed(undefined); }}>
          <DialogTrigger asChild>
            <Button variant="ghost" className="self-start">
              <Plus /> {t("milestone.add")}
            </Button>
          </DialogTrigger>
          {/* In a dialog rather than inline on the card, so the date field's own
              calendar has room to open without landing on the rows below it. */}
          <DialogContent title={t("milestone.add")} closeLabel={t("common.close")}>
            <form noValidate ref={form} action={submit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-label text-fg">{t("milestone.kind")}</span>
                <Select value={kind} onValueChange={setKind}>
                  <SelectTrigger aria-label={t("milestone.kind")}>
                    <SelectValue placeholder={t("milestone.chooseKind")} />
                  </SelectTrigger>
                  <SelectContent>
                    {KINDS.map((k) => (
                      <SelectItem key={k} value={k}>{label(k)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="milestone-date" className="text-label text-fg">
                  {t("milestone.date")}
                </label>
                <DateField id="milestone-date" name="occurredOn" max={TODAY} required />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="milestone-notes" className="text-label text-fg">
                  {t("milestone.notes")}
                </label>
                <Input id="milestone-notes" name="notes" autoComplete="off" />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                  {t("action.cancel")}
                </Button>
              <Button type="submit" disabled={!kind || pending}>{t("action.add")}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

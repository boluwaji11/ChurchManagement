"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import {
  Badge, Banner, Button, Input,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@hearth/ui";
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
      {error ? <Banner tone="danger" title={t("person.milestones")}>{error}</Banner> : null}
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
              <Button variant="ghost" className="ml-auto" onClick={() => remove(row.id)}>
                <X /> {t("milestone.remove")}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>

      {canEdit ? (
        adding ? (
          <form ref={form} action={submit} className="flex flex-wrap items-end gap-3">
            <div className="flex min-w-48 flex-col gap-1.5">
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
              <Input id="milestone-date" name="occurredOn" type="date" required className="max-w-44" />
            </div>

            <div className="flex min-w-48 flex-1 flex-col gap-1.5">
              <label htmlFor="milestone-notes" className="text-label text-fg">
                {t("milestone.notes")}
              </label>
              <Input id="milestone-notes" name="notes" autoComplete="off" />
            </div>

            <Button type="submit" disabled={!kind || pending}>{t("action.add")}</Button>
            <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
              {t("action.cancel")}
            </Button>
          </form>
        ) : (
          <div>
            <Button variant="ghost" onClick={() => { setAdding(true); setFollowed(undefined); }}>
              <Plus /> {t("milestone.add")}
            </Button>
          </div>
        )
      ) : null}
    </div>
  );
}

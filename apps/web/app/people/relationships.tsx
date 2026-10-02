"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, X, ShieldAlert } from "lucide-react";
import {
  Badge, Banner, Button, IconButton, Combobox, Dialog, DialogTrigger, DialogContent, DialogFooter, DialogClose,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import { addRelation, removeRelation } from "./relationship-actions";

export interface RelationRow {
  id: string;
  kind: string;
  relatedPersonId: string;
  relatedName: string;
}

export interface Candidate {
  id: string;
  name: string;
}

const KINDS = [
  "spouse", "parent", "child", "guardian", "emergency_contact", "do_not_contact",
] as const;

const label = (kind: string) => t(`relationship.kind.${kind}` as never);

/**
 * R2.4. Relationships on a person's record.
 *
 * A do-not-contact order is shown in the danger tone and sits at the top of the
 * list, because R8.9 turns it into a blocking control at check-in and a
 * volunteer scanning this card at the door reads the first line.
 */
export function Relationships({
  church,
  personId,
  rows,
  candidates,
  canEdit,
  canLift,
}: {
  church: string;
  personId: string;
  rows: RelationRow[];
  candidates: Candidate[];
  canEdit: boolean;
  canLift: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = React.useState(false);
  const [related, setRelated] = React.useState("");
  const [kind, setKind] = React.useState("");
  const [error, setError] = React.useState<string>();
  const [cancelled, setCancelled] = React.useState(0);
  const [pending, startTransition] = React.useTransition();

  const submit = () => {
    if (!related || !kind) return;
    const data = new FormData();
    data.set("church", church);
    data.set("personId", personId);
    data.set("relatedPersonId", related);
    data.set("kind", kind);

    startTransition(async () => {
      const result = await addRelation(data);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(undefined);
      setCancelled(result.cancelled ?? 0);
      setAdding(false);
      setRelated("");
      setKind("");
      router.refresh();
    });
  };

  const remove = (id: string) => {
    const data = new FormData();
    data.set("church", church);
    data.set("personId", personId);
    data.set("id", id);

    startTransition(async () => {
      const result = await removeRelation(data);
      if (result.error) setError(result.error);
      else {
        setError(undefined);
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-col gap-3" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("relationship.failed")}>{error}</Banner> : null}
      {cancelled > 0 ? (
        <Banner tone="warning" title={plural("relationship.cancelled", cancelled)} />
      ) : null}

      <ul className="flex flex-col gap-2">
        {rows.length === 0 ? (
          <li className="text-[length:var(--d-text-body)] text-fg-muted">{t("relationship.none")}</li>
        ) : null}

        {rows.map((row) => {
          const blocked = row.kind === "do_not_contact";
          return (
            <li
              key={row.id}
              className={
                blocked
                  ? "flex flex-wrap items-center gap-3 rounded-lg border border-danger/30 bg-danger-soft/40 p-2.5"
                  : "flex flex-wrap items-center gap-3 rounded-lg border border-line bg-canvas p-2.5"
              }
            >
              <Badge tone={blocked ? "danger" : "neutral"}>
                {blocked ? <ShieldAlert className="size-3" /> : null}
                {label(row.kind)}
              </Badge>
              <Link
                href={`/people/${row.relatedPersonId}?church=${church}`}
                className="text-[length:var(--d-text-body)] text-fg underline-offset-2 hover:underline"
              >
                {row.relatedName}
              </Link>

              {blocked ? (
                canLift ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <IconButton
                        label={t("relationship.remove")}
                        variant="ghost"
                        className="ml-auto"
                      >
                        <X />
                      </IconButton>
                    </DialogTrigger>
                    <DialogContent
                      alert
                      title={t("relationship.removeDoNotContactTitle", { name: row.relatedName })}
                    >
                      <p className="mb-5 text-[length:var(--d-text-body)] text-fg-muted">
                        {t("relationship.removeDoNotContactBody", { name: row.relatedName })}
                      </p>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="ghost" data-dismiss>{t("relationship.keep")}</Button>
                        </DialogClose>
                        <DialogClose asChild>
                          <Button variant="danger" onClick={() => remove(row.id)}>
                            {t("relationship.remove")}
                          </Button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                ) : null
              ) : canEdit ? (
                <IconButton
                  label={t("relationship.remove")}
                  variant="ghost"
                  className="ml-auto"
                  onClick={() => remove(row.id)}
                >
                  <X />
                </IconButton>
              ) : null}
            </li>
          );
        })}
      </ul>

      {canEdit ? (
        adding ? (
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex min-w-56 flex-col gap-1.5">
              <span className="text-label text-fg">{t("relationship.person")}</span>
              <Combobox
                aria-label={t("relationship.person")}
                options={candidates.map((c) => ({ value: c.id, label: c.name }))}
                value={related}
                onChange={setRelated}
                placeholder={t("relationship.choosePerson")}
                emptyLabel={t("relationship.noMatch")}
                clearLabel={t("relationship.clearPerson")}
              />
            </div>

            <div className="flex min-w-44 flex-col gap-1.5">
              <span className="text-label text-fg">{t("relationship.kind")}</span>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger aria-label={t("relationship.kind")}>
                  <SelectValue placeholder={t("relationship.chooseKind")} />
                </SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => (
                    <SelectItem key={k} value={k}>{label(k)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={submit} disabled={!related || !kind || pending}>
              {t("action.add")}
            </Button>
            <Button variant="ghost" onClick={() => setAdding(false)}>{t("action.cancel")}</Button>
          </div>
        ) : (
          <div>
            <Button variant="ghost" onClick={() => { setAdding(true); setCancelled(0); }}>
              <Plus /> {t("relationship.add")}
            </Button>
          </div>
        )
      ) : null}
    </div>
  );
}

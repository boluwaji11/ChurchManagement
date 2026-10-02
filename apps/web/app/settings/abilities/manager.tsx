"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Archive, Undo2 } from "lucide-react";
import {
  Badge, Banner, Button, Card, CardTitle, Field, Input, Separator, EmptyState,
  Dialog, DialogContent, DialogFooter,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import { add, rename, archive } from "./actions";

interface Row {
  id: string;
  kind: string;
  name: string;
  count: number;
  archived: boolean;
}

const kindLabel = (kind: string) => t(`ability.kind.${kind}.plural` as never);

/**
 * R2.9. Three lists a church keeps for one question: who can do this.
 *
 * Grouped by kind rather than one list with a column, because a church reads
 * these as three different questions and scanning a mixed list for the gifts
 * among the skills is work nobody should be doing.
 */
export function AbilityManager({
  church,
  kinds,
  abilities,
  showingArchived,
}: {
  church: string;
  kinds: string[];
  abilities: Row[];
  showingArchived: boolean;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [renaming, setRenaming] = React.useState<Row | null>(null);
  const [archiving, setArchiving] = React.useState<Row | null>(null);
  const [pending, startTransition] = React.useTransition();

  const run = (work: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      if (!result.error) router.refresh();
    });

  return (
    <div className="flex flex-col gap-6" aria-busy={pending}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-heading font-display text-fg">{t("ability.title")}</h2>
        <Link
          href={`/settings/abilities?church=${church}${showingArchived ? "" : "&show=archived"}`}
          className="text-label text-fg-muted hover:text-fg"
        >
          {showingArchived ? t("ability.hideArchived") : t("ability.showArchived")}
        </Link>
      </div>

      {error ? <Banner tone="danger" title={t("ability.title")}>{error}</Banner> : null}

      <Card>
        <CardTitle>{t("ability.add")}</CardTitle>
        <Separator className="my-4" />
        <AddForm church={church} kinds={kinds} onDone={() => router.refresh()} />
      </Card>

      {abilities.length === 0 ? (
        <EmptyState title={t("ability.empty.title")} body={t("ability.empty.body")} />
      ) : null}

      {kinds.map((kind) => {
        const rows = abilities.filter((a) => a.kind === kind);
        if (rows.length === 0) return null;

        return (
          <Card key={kind}>
            <CardTitle>{kindLabel(kind)}</CardTitle>
            <Separator className="my-4" />
            <ul className="flex flex-col">
              {rows.map((row, i) => (
                <li key={row.id}>
                  {i > 0 ? <Separator className="my-3" /> : null}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[length:var(--d-text-body)] text-fg">{row.name}</span>
                      {row.archived ? <Badge tone="neutral">{t("ability.archived")}</Badge> : null}
                      <span className="text-caption text-fg-muted">
                        {row.count === 0 ? t("ability.none") : plural("ability.holders", row.count)}
                      </span>
                    </span>

                    <span className="flex flex-wrap items-center gap-1">
                      {row.archived ? (
                        <Button
                          variant="ghost"
                          disabled={pending}
                          onClick={() => run(() => archive(row.id, false, church))}
                        >
                          <Undo2 /> {t("ability.restore")}
                        </Button>
                      ) : (
                        <>
                          <Button variant="ghost" disabled={pending} onClick={() => setRenaming(row)}>
                            <Pencil /> {t("ability.rename")}
                          </Button>
                          <Button variant="ghost" disabled={pending} onClick={() => setArchiving(row)}>
                            <Archive /> {t("ability.archive")}
                          </Button>
                        </>
                      )}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}

      <Dialog open={renaming !== null} onOpenChange={(on) => setRenaming(on ? renaming : null)}>
        <DialogContent
          title={renaming ? t("ability.renameTitle", { name: renaming.name }) : ""}
          closeLabel={t("common.close")}
        >
          <form
            noValidate
            action={(data) => {
              const row = renaming;
              setRenaming(null);
              if (row) run(() => rename(row.id, String(data.get("name") ?? ""), church));
            }}
            className="flex flex-col gap-4"
          >
            <Field label={t("ability.name")} required>
              <Input name="name" defaultValue={renaming?.name} autoComplete="off" autoFocus />
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={pending}>{t("action.save")}</Button>
              <Button type="button" variant="ghost" onClick={() => setRenaming(null)}>
                {t("action.cancel")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={archiving !== null} onOpenChange={(on) => setArchiving(on ? archiving : null)}>
        <DialogContent alert title={archiving ? t("ability.archiveTitle", { name: archiving.name }) : ""}>
          <p className="mb-5 text-[length:var(--d-text-body)] text-fg">{t("ability.archiveBody")}</p>
          <DialogFooter>
            <Button variant="ghost" data-dismiss onClick={() => setArchiving(null)}>
              {t("ability.archiveKeep")}
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                const row = archiving;
                setArchiving(null);
                if (row) run(() => archive(row.id, true, church));
              }}
            >
              <Archive /> {t("ability.archive")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddForm({
  church,
  kinds,
  onDone,
}: {
  church: string;
  kinds: string[];
  onDone: () => void;
}) {
  const [kind, setKind] = React.useState(kinds[0] ?? "skill");
  const [failed, setFailed] = React.useState<string>();
  const [saving, startTransition] = React.useTransition();

  return (
    <form
      noValidate
      action={(data) => {
        data.set("church", church);
        data.set("kind", kind);
        startTransition(async () => {
          const result = await add(data);
          setFailed(result.error);
          if (!result.error) onDone();
        });
      }}
      className="flex flex-col gap-4"
    >
      {failed ? <Banner tone="danger" title={t("ability.add")}>{failed}</Banner> : null}

      <div className="flex flex-wrap items-end gap-3">
        <Field label={t("ability.list")} className="w-48">
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {kinds.map((k) => (
                <SelectItem key={k} value={k}>{t(`ability.kind.${k}` as never)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label={t("ability.name")} className="min-w-48 flex-1" required>
          <Input name="name" autoComplete="off" />
        </Field>

        <Button type="submit" loading={saving}>
          <Plus /> {t("ability.add")}
        </Button>
      </div>
    </form>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Archive, ShieldCheck, Baby, Pencil } from "lucide-react";
import {
  Banner, Button, IconButton, Checkbox, Field, Input, Separator,
  Dialog, DialogTrigger, DialogContent, DialogFooter, EmptyState,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { savePosition, archivePosition } from "../actions";

export interface PositionRow {
  id: string;
  name: string;
  needed: number;
  withChildren: boolean;
  requiresCheck: boolean;
}

/**
 * R10.1, R10.2. The positions a team schedules, and what each one asks for.
 *
 * Held on the position rather than on the person, because "this job is with
 * children and needs a check" is a claim about the job.
 */
export function Positions({
  church,
  teamId,
  positions,
  canManage,
}: {
  church: string;
  teamId: string;
  positions: PositionRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const remove = (id: string) => {
    startTransition(async () => {
      const result = await archivePosition(id, church);
      setError(result.error);
      if (!result.error) router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("serving.failed")}>{error}</Banner> : null}

      {positions.length === 0 ? (
        <EmptyState title={t("serving.position.empty")} />
      ) : (
        <ul className="flex flex-col">
          {positions.map((position, i) => (
            <li key={position.id}>
              {i > 0 ? <Separator className="my-2" /> : null}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex flex-wrap items-center gap-3">
                  <span className="text-[length:var(--d-text-body)] text-fg">
                    {position.name}
                  </span>
                  <span className="text-caption text-fg-muted tabular-nums">
                    {position.needed}
                  </span>
                  {position.withChildren ? (
                    <Baby className="size-4 text-fg-muted" aria-label={t("serving.position.withChildren")} />
                  ) : null}
                  {position.requiresCheck ? (
                    <ShieldCheck className="size-4 text-fg-muted" aria-label={t("serving.position.requiresCheck")} />
                  ) : null}
                </span>

                {canManage ? (
                  <span className="flex items-center gap-1">
                    <PositionDialog
                      church={church}
                      teamId={teamId}
                      position={position}
                      title={position.name}
                      trigger={<IconButton label={t("action.edit")}><Pencil /></IconButton>}
                    />
                    <ArchivePosition
                      name={position.name}
                      pending={pending}
                      onConfirm={() => remove(position.id)}
                    />
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        <div>
          <PositionDialog
            church={church}
            teamId={teamId}
            title={t("serving.position.add")}
            trigger={
              <Button variant="secondary"><Plus /> {t("serving.position.add")}</Button>
            }
          />
        </div>
      ) : null}
    </div>
  );
}

function PositionDialog({
  church,
  teamId,
  position,
  title,
  trigger,
}: {
  church: string;
  teamId: string;
  position?: PositionRow;
  title: string;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [name, setName] = React.useState(position?.name ?? "");
  const [needed, setNeeded] = React.useState(String(position?.needed ?? 1));
  const [withChildren, setWithChildren] = React.useState(position?.withChildren ?? false);
  const [requiresCheck, setRequiresCheck] = React.useState(position?.requiresCheck ?? false);
  const [saving, startTransition] = React.useTransition();

  // R10.2. Ticking "works with children" asks for the check, because the church
  // that forgets to tick the second box is the case the requirement exists for.
  const children = (on: boolean) => {
    setWithChildren(on);
    if (on) setRequiresCheck(true);
  };

  const submit = () => {
    startTransition(async () => {
      const result = await savePosition(
        position?.id ?? null,
        { teamId, name, needed: Number(needed), withChildren, requiresCheck },
        church,
      );
      setError(result.error);
      if (!result.error) {
        setOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={title} closeLabel={t("common.close")}>
        <div className="flex flex-col gap-4">
          {error ? <Banner tone="danger" title={t("serving.failed")}>{error}</Banner> : null}

          <Field label={t("serving.position.name")}>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" autoFocus />
          </Field>

          <Field label={t("serving.position.needed")}>
            <Input
              type="number"
              min={1}
              max={99}
              value={needed}
              onChange={(e) => setNeeded(e.target.value)}
              className="w-24"
            />
          </Field>

          <label className="flex cursor-pointer items-center gap-3">
            <Checkbox
              checked={withChildren}
              onCheckedChange={(on) => children(on === true)}
            />
            <span className="text-[length:var(--d-text-body)] text-fg">
              {t("serving.position.withChildren")}
            </span>
          </label>

          <label className="flex cursor-pointer items-center gap-3">
            <Checkbox
              checked={requiresCheck}
              onCheckedChange={(on) => setRequiresCheck(on === true)}
            />
            <span className="text-[length:var(--d-text-body)] text-fg">
              {t("serving.position.requiresCheck")}
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" disabled={saving} onClick={submit}>{t("action.save")}</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("action.cancel")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ArchivePosition({
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
        <IconButton
          label={t("serving.archive")}
          variant="ghost"
        >
          <Archive />
        </IconButton>
      </DialogTrigger>
      <DialogContent alert title={t("serving.position.archiveTitle", { name })}>
        <div className="flex flex-col gap-4">
          <p className="text-[length:var(--d-text-body)] text-fg">
            {t("serving.position.confirm", { name })}
          </p>
          <DialogFooter>
            <Button variant="ghost" data-dismiss onClick={() => setOpen(false)}>
              {t("serving.keep")}
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                setOpen(false);
                onConfirm();
              }}
            >
              <Archive /> {t("serving.archive")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Archive, Plus, Trash2 } from "lucide-react";
import {
  Banner, Button, IconButton, Field, HueDot, Input, Switch, Textarea,
  Dialog, DialogTrigger, DialogContent, DialogFooter,
  Sheet, SheetTrigger, SheetContent,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  HUES, type Hue,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { saveTeam, savePosition, archivePosition } from "./actions";
import { useFormError } from "@/lib/form-error";

export interface TeamDraft {
  id: string;
  name: string;
  description: string | null;
  hue: string;
}

/** R10.2. A position as the dialog holds it while it is being edited. */
export interface PositionDraft {
  /** Null on a position being written for the first time. */
  id: string | null;
  name: string;
  /** R10.3. How many of this position a service needs filled. */
  needed: number;
  /** R10.10. Whether it puts somebody in a room with children. */
  withChildren: boolean;
  /** R10.11. Whether a valid background check gates being scheduled to it. */
  requiresCheck: boolean;
}

const EMPTY_POSITION: PositionDraft = {
  id: null,
  name: "",
  needed: 1,
  withChildren: false,
  requiresCheck: false,
};

/**
 * R10.1. Writing a team down.
 *
 * One form for creating and for editing, carrying the same fields either way.
 * A form that asks for positions when a team is created and then hides them
 * when it is opened again teaches the reader that the first screen was the real
 * one and this is a lesser version of it.
 */
export function TeamDialog({
  church,
  team,
  positions: existing,
  title,
  trigger,
}: {
  church: string;
  team?: TeamDraft;
  /** R10.2. What the team schedules today, when one is being edited. */
  positions?: PositionDraft[];
  title: string;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = useFormError(open);
  const [hue, setHue] = React.useState(team?.hue ?? "teal");
  /*
   * R10.2. A team is the positions it schedules, so they are written here
   * rather than on a second screen somebody has to find afterwards.
   */
  const blank: PositionDraft[] = existing ?? [];
  const [positions, setPositions] = React.useState<PositionDraft[]>(
    blank.length > 0 ? blank : [EMPTY_POSITION],
  );
  /** The ones taken off the list, archived when the form is saved. */
  const [dropped, setDropped] = React.useState<string[]>([]);
  const [saving, startTransition] = React.useTransition();
  // The actions sit in the panel's own footer, outside the form, so they reach
  // it by name.
  const formId = React.useId();

  const change = (at: number, fields: Partial<PositionDraft>) =>
    setPositions((was) => was.map((one, i) => (i === at ? { ...one, ...fields } : one)));

  // The panel is filled from the team each time it opens, so a close without
  // saving does not leave half an edit behind for the next reader.
  React.useEffect(() => {
    if (!open) return;
    setPositions(blank.length > 0 ? blank : [EMPTY_POSITION]);
    setDropped([]);
    setHue(team?.hue ?? "teal");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      {/* R24.6. From the right rather than over the middle: the team being
          written down belongs beside the list of teams it joins, and the panel
          has room for the positions without the page moving. */}
      <SheetContent
        title={title}
        closeLabel={t("common.close")}
        width="520px"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("action.cancel")}
            </Button>
            <Button type="submit" form={formId} disabled={saving}>
              {t("action.save")}
            </Button>
          </>
        }
      >
        <form
          id={formId}
          noValidate
          action={(data) => {
            data.set("church", church);
            data.set("hue", hue);
            if (team) data.set("id", team.id);
            startTransition(async () => {
              const result = await saveTeam(data);
              setError(result.error);
              if (result.error) return;

              const teamId = team?.id ?? result.id;
              if (teamId) {
                for (const id of dropped) await archivePosition(id, church);

                for (const one of positions) {
                  const name = one.name.trim();
                  if (!name) continue;
                  const was = (existing ?? []).find((row) => row.id === one.id);
                  if (
                    one.id
                    && was?.name === name
                    && was.needed === one.needed
                    && was.withChildren === one.withChildren
                    && was.requiresCheck === one.requiresCheck
                  ) continue;
                  await savePosition(
                    one.id,
                    {
                      teamId,
                      name,
                      needed: one.needed,
                      withChildren: one.withChildren,
                      requiresCheck: one.requiresCheck,
                    },
                    church,
                  );
                }
              }

              setOpen(false);
              router.refresh();
            });
          }}
          className="flex flex-col gap-4"
        >
          {error ? <Banner tone="danger" title={t("serving.failed")}>{error}</Banner> : null}

          <Field label={t("serving.team.name")} required>
            <Input name="name" defaultValue={team?.name ?? ""} autoComplete="off" autoFocus />
          </Field>

          <Field label={t("serving.team.description")}>
            <Textarea name="description" rows={2} defaultValue={team?.description ?? ""} />
          </Field>

          <div className="flex flex-col gap-2">
            <span className="text-label text-fg">{t("serving.team.positions")}</span>

            {/* R10.2. The same path the setup dock draws: a marker a row, the
                line between them carrying its own dot. A position is one line
                of a list, and a boxed card each made six of them read as six
                separate things. */}
            <div>
              <ol className="m-0 flex list-none flex-col p-0">
                {positions.map((one, i) => (
                  <li key={one.id ?? `new-${i}`} className="flex items-start gap-2.5">
                    <span className="flex w-5 shrink-0 flex-col items-center" aria-hidden>
                      <span className="grid size-5 shrink-0 place-items-center rounded-full border border-line-strong bg-surface text-[10px] font-semibold text-fg-subtle">
                        {i + 1}
                      </span>
                      {i === positions.length - 1 ? null : (
                        <span className="relative my-1 w-px flex-1 bg-line-strong">
                          <span className="absolute top-1/2 left-1/2 size-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-line-strong" />
                        </span>
                      )}
                    </span>

                    <div className="flex min-w-0 flex-1 flex-col gap-1.5 pb-3">
                      <div className="flex items-start gap-2">
                        <input
                          value={one.name}
                          aria-label={t("serving.position.name")}
                          autoComplete="off"
                          className="-mt-1 min-w-0 flex-1 rounded-sm border-b border-line bg-transparent px-1 py-1 text-[length:var(--d-text-body)] text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                          onChange={(e) => change(i, { name: e.target.value })}
                        />
                        <IconButton
                          label={t("serving.position.remove")}
                          variant="ghost"
                          className="-mt-2.5"
                          onClick={() => {
                            if (one.id) setDropped((was) => [...was, one.id!]);
                            setPositions((was) => was.filter((_, at) => at !== i));
                          }}
                        >
                          <Trash2 />
                        </IconButton>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-fg-muted">
                        <label className="flex items-center gap-1.5">
                          {t("serving.position.needed")}
                          <input
                            type="number"
                            min={1}
                            value={one.needed}
                            className="w-14 rounded-sm border-b border-line bg-transparent px-1 py-0.5 text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                            onChange={(e) =>
                              change(i, { needed: Math.max(1, Number(e.target.value) || 1) })
                            }
                          />
                        </label>

                        {/* R10.10, R10.11. A position in a children's room is
                            the one that gates scheduling on a valid check, so
                            both facts are set where the position is written. */}
                        <label className="flex items-center gap-1.5">
                          <Switch
                            checked={one.withChildren}
                            onCheckedChange={(on) =>
                              change(i, { withChildren: on, requiresCheck: on || one.requiresCheck })
                            }
                          />
                          {t("serving.position.withChildren")}
                        </label>

                        <label className="flex items-center gap-1.5">
                          <Switch
                            checked={one.requiresCheck}
                            disabled={one.withChildren}
                            onCheckedChange={(on) => change(i, { requiresCheck: on })}
                          />
                          {t("serving.position.requiresCheck")}
                        </label>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <Button
              type="button"
              variant="ghost"
              className="self-start"
              onClick={() => setPositions((was) => [...was, EMPTY_POSITION])}
            >
              <Plus /> {t("serving.position.add")}
            </Button>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-label text-fg">{t("serving.team.colour")}</span>
            <Select value={hue} onValueChange={setHue}>
              <SelectTrigger aria-label={t("serving.team.colour")} className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HUES.map((option) => (
                  <SelectItem key={option} value={option}>
                    <span className="flex items-center gap-2">
                      <HueDot hue={option as Hue} />
                      {t(`hue.${option}` as never)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

        </form>
      </SheetContent>
    </Sheet>
  );
}

export function ArchiveTeamDialog({
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
      <DialogContent alert title={t("serving.archiveTitle", { name })}>
        <div className="flex flex-col gap-4">
          <p className="text-[length:var(--d-text-body)] text-fg">{t("serving.archiveBody")}</p>
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

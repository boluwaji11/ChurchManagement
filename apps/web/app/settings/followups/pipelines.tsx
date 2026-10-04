"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Power } from "lucide-react";
import {
  Badge, Banner, Button, IconButton, Field, Input, Separator, Textarea,
  Dialog, DialogTrigger, DialogContent,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  LIFT,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { Empty } from "@/components/empty";
import { addPipeline, savePipeline, switchPipeline } from "./actions";

export interface StepRow {
  id: string;
  name: string;
  dueDays: number;
}

export interface PipelineRow {
  id: string;
  name: string;
  description: string | null;
  hue: string;
  ownerUserId: string | null;
  archived: boolean;
  steps: StepRow[];
}

export interface TeamMember {
  userId: string;
  name: string;
}

const NOBODY = "nobody";

/** The pill a step and the add control share, so the row reads as one run. */
const CHIP = "flex h-10 items-center rounded-[10px] px-3 text-label font-medium";

/**
 * R5.2. The stages, in the church's own words.
 *
 * A name, what it is for, who it lands on, and the steps with how many days
 * each gets. The whole card opens the stage. There is no canvas and no branch:
 * that is R5.8, deferred, and it is the feature that makes the free
 * competition unusable.
 */
export function Pipelines({
  church,
  rows,
  team,
}: {
  church: string;
  rows: PipelineRow[];
  team: TeamMember[];
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const run = (work: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      if (!result.error) router.refresh();
    });

  /** R5.2. Writes the whole step list back, which is what the action takes. */
  const writeSteps = (
    row: PipelineRow,
    steps: Array<{ id: string; name: string; dueDays: number }>,
  ) => {
    const data = new FormData();
    data.set("church", church);
    data.set("id", row.id);
    data.set("name", row.name);
    data.set("description", row.description ?? "");
    data.set("ownerUserId", row.ownerUserId ?? "");
    for (const step of steps) {
      data.append("stepId", step.id);
      data.append("stepName", step.name);
      data.append("stepDays", String(step.dueDays));
    }
    run(() => savePipeline(data));
  };

  if (rows.length === 0) {
    return (
      <Empty
        icon="order"
        title={t("pipelines.none.title")}
        body={t("pipelines.none.body")}
        action={<NewPipeline church={church} team={team} />}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("pipelines.failed")}>{error}</Banner> : null}

      {rows.map((row) => (
        <section
          key={row.id}
          className={`relative flex flex-col gap-3.5 rounded-[14px] border border-line bg-surface px-5 py-4.5 ${LIFT} ${
            row.archived ? "opacity-55" : ""
          }`}
        >
          {/* R24.6. The whole card opens the stage. The trigger is a layer under
              the card's contents rather than a wrapper around them, so the
              power switch and the step chips stay controls of their own. */}
          <EditDialog
            church={church}
            row={row}
            team={team}
            pending={pending}
            trigger={
              <button
                type="button"
                aria-label={t("pipelines.editOne", { name: row.name })}
                className="absolute inset-0 z-0 cursor-pointer rounded-[14px]"
              />
            }
          />

          <div className="pointer-events-none relative flex flex-wrap items-center gap-2.5">
            <span
              className="size-3 shrink-0 rounded-[4px]"
              style={{ background: `var(--hue-${row.hue}-500)` }}
            />
            <span
              className={`flex-1 font-display text-[20px] text-fg ${
                row.archived ? "line-through decoration-2" : ""
              }`}
            >
              {row.name}
            </span>

            {row.archived ? <Badge tone="neutral">{t("pipelines.off")}</Badge> : null}

            <span className="text-label text-fg-subtle">
              {t("pipelines.ownedBy", {
                name: team.find((one) => one.userId === row.ownerUserId)?.name
                  ?? t("pipelines.nobody"),
              })}
            </span>

            <IconButton
              label={row.archived ? t("pipelines.on") : t("pipelines.turnOff")}
              variant="ghost"
              className="pointer-events-auto"
              disabled={pending}
              onClick={() => run(() => switchPipeline(row.id, !row.archived, church))}
            >
              <Power />
            </IconButton>
          </div>

          {/* The steps carry the stage's own colour, so a church reads the
              order of a journey by its hue down the page. */}
          <div className="pointer-events-none relative flex flex-wrap items-center gap-2">
            {row.steps.map((step, at) => (
              <span
                key={step.id}
                className={`${CHIP} gap-2 pr-1.5`}
                style={{
                  background: `var(--hue-${row.hue}-tint)`,
                  color: `var(--hue-${row.hue}-key)`,
                }}
              >
                <span className="text-[11px] font-semibold tabular-nums opacity-70">{at + 1}</span>
                <span>{step.name}</span>
                <span className="text-[12px] opacity-70">
                  {t("pipelines.dueIn", { count: String(step.dueDays) })}
                </span>
                <IconButton
                  label={t("pipelines.removeOne", { name: step.name })}
                  className="pointer-events-auto size-6 min-h-0 rounded-full text-inherit [&_svg]:size-3.5"
                  disabled={pending}
                  onClick={() =>
                    writeSteps(
                      row,
                      row.steps.filter((one) => one.id !== step.id),
                    )}
                >
                  <X />
                </IconButton>
              </span>
            ))}

            <AddStep
              pending={pending}
              onAdd={(name, dueDays) =>
                writeSteps(row, [
                  ...row.steps.map((one) => ({ id: one.id, name: one.name, dueDays: one.dueDays })),
                  { id: "", name, dueDays },
                ])}
            />
          </div>

          {row.description ? (
            <span className="pointer-events-none relative text-fg-muted">{row.description}</span>
          ) : null}
        </section>
      ))}
    </div>
  );
}

/**
 * R5.2. A step, asked for in a box rather than in a field left open on the page.
 *
 * The same shape the tags screen uses: the run of pills is what the card is,
 * and the last pill makes another one.
 */
function AddStep({
  pending,
  onAdd,
}: {
  pending: boolean;
  onAdd: (name: string, dueDays: number) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [days, setDays] = React.useState("7");

  const ready = name.trim() !== "" && Number.isInteger(Number(days)) && Number(days) >= 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setName("");
          setDays("7");
        }
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          disabled={pending}
          className={`${CHIP} pointer-events-auto cursor-pointer gap-1.5 border border-dashed border-line-strong text-fg-muted hover:bg-sunken hover:text-fg`}
        >
          <Plus className="size-4" aria-hidden /> {t("pipelines.addStep")}
        </button>
      </DialogTrigger>

      <DialogContent title={t("pipelines.addStep")} closeLabel={t("common.close")}>
        <div className="flex flex-col gap-4">
          <Field label={t("pipelines.step")} required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </Field>

          <Field label={t("pipelines.days")}>
            <Input
              value={days}
              inputMode="numeric"
              onChange={(e) => setDays(e.target.value)}
            />
          </Field>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              {t("action.cancel")}
            </Button>
            <Button
              type="button"
              disabled={!ready}
              onClick={() => {
                onAdd(name.trim(), Number(days));
                setOpen(false);
              }}
            >
              {t("action.add")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** R5.2. A stage of this church's own, filled in where it is made. */
export function NewPipeline({ church, team }: { church: string; team: TeamMember[] }) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus /> {t("pipelines.add")}</Button>
      </DialogTrigger>
      <DialogContent title={t("pipelines.addTitle")} closeLabel={t("common.close")} className="max-w-xl">
        {open ? (
          <StageForm church={church} team={team} onDone={() => setOpen(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({
  church,
  row,
  team,
  pending,
  trigger,
}: {
  church: string;
  row: PipelineRow;
  team: TeamMember[];
  pending: boolean;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={row.name} closeLabel={t("common.close")} className="max-w-xl">
        {/* Mounted with the box, so a stage edited, closed and opened again
            starts from what was saved rather than from what was typed. */}
        {open ? (
          <StageForm
            church={church}
            row={row}
            team={team}
            pending={pending}
            onDone={() => setOpen(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/**
 * R5.2. One stage, whether it is being made or being changed.
 *
 * A church making its own stage needs the same four things as one editing the
 * six it was given: what it is called, what it is for, who it lands on, and
 * the steps. One form, so the two never drift apart.
 */
function StageForm({
  church,
  row,
  team,
  pending,
  onDone,
}: {
  church: string;
  /** The stage being changed, where there is one. */
  row?: PipelineRow;
  team: TeamMember[];
  pending?: boolean;
  onDone: () => void;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [owner, setOwner] = React.useState(row?.ownerUserId ?? NOBODY);
  const [steps, setSteps] = React.useState<{ key: string; id: string; name: string; days: string }[]>(
    (row?.steps ?? []).map((step) => ({
      key: step.id, id: step.id, name: step.name, days: String(step.dueDays),
    })),
  );
  const [saving, startTransition] = React.useTransition();

  const change = (key: string, patch: { name?: string; days?: string }) =>
    setSteps((all) => all.map((step) => (step.key === key ? { ...step, ...patch } : step)));

  return (
    <form
      noValidate
      action={(data) => {
        data.set("church", church);
        if (row) data.set("id", row.id);
        data.set("ownerUserId", owner === NOBODY ? "" : owner);
        startTransition(async () => {
          const result = await (row ? savePipeline(data) : addPipeline(data));
          setError(result.error);
          if (!result.error) {
            onDone();
            router.refresh();
          }
        });
      }}
      className="flex flex-col gap-4"
    >
      {error ? <Banner tone="danger" title={t("pipelines.failed")}>{error}</Banner> : null}

      <Field label={t("pipelines.name")} required>
        <Input name="name" defaultValue={row?.name ?? ""} autoComplete="off" autoFocus={!row} />
      </Field>

      <Field label={t("pipelines.description")}>
        <Textarea name="description" rows={2} defaultValue={row?.description ?? ""} />
      </Field>

      <div className="flex flex-col gap-1.5">
        <span className="text-label text-fg">{t("pipelines.owner")}</span>
        <Select value={owner} onValueChange={setOwner}>
          <SelectTrigger aria-label={t("pipelines.owner")}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NOBODY}>{t("pipelines.nobody")}</SelectItem>
            {team.map((member) => (
              <SelectItem key={member.userId} value={member.userId}>{member.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <span className="text-label text-fg">{t("pipelines.steps")}</span>

        {steps.map((step) => (
          <div key={step.key} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="stepId" value={step.id} />
            <div className="min-w-48 flex-1">
              <Field label={t("pipelines.step")} required>
                <Input
                  name="stepName"
                  value={step.name}
                  onChange={(e) => change(step.key, { name: e.target.value })}
                  autoComplete="off"
                />
              </Field>
            </div>
            <div className="w-24">
              <Field label={t("pipelines.days")}>
                <Input
                  name="stepDays"
                  inputMode="numeric"
                  value={step.days}
                  onChange={(e) => change(step.key, { days: e.target.value })}
                />
              </Field>
            </div>
            <IconButton
              label={t("pipelines.removeStep")}
              type="button"
              variant="ghost"
              onClick={() => setSteps((all) => all.filter((s) => s.key !== step.key))}
            >
              <X />
            </IconButton>
          </div>
        ))}

        <div>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setSteps((all) => [
                ...all,
                { key: `new-${all.length}-${Date.now()}`, id: "", name: "", days: "7" },
              ])
            }
          >
            <Plus /> {t("pipelines.addStep")}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onDone}>
          {t("action.cancel")}
        </Button>
        <Button type="submit" disabled={pending || saving}>
          {row ? t("action.save") : t("action.add")}
        </Button>
      </div>
    </form>
  );
}

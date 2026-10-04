"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Pencil, Power } from "lucide-react";
import {
  Badge, Banner, Button, IconButton, Field, Input, Separator, Textarea,
  Dialog, DialogTrigger, DialogContent,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { savePipeline, switchPipeline } from "./actions";

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

/**
 * R5.2. The six, in the church's own words.
 *
 * A name, what it is for, who it lands on, and the steps with how many days
 * each gets. There is no button that makes a seventh and none that draws a
 * branch: that is R5.8, deferred, and it is the feature that makes the free
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

  return (
    <div className="flex flex-col gap-5" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("pipelines.failed")}>{error}</Banner> : null}

      {rows.map((row) => (
        <section
          key={row.id}
          className="flex flex-col gap-3.5 rounded-[14px] border border-line bg-surface px-5 py-4.5"
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className="size-3 shrink-0 rounded-[4px]"
              style={{ background: `var(--hue-${row.hue}-500)` }}
            />
            <span className="flex-1 font-display text-[20px] text-fg">{row.name}</span>

            {row.archived ? <Badge tone="neutral">{t("pipelines.off")}</Badge> : null}

            <span className="text-label text-fg-subtle">
              {t("pipelines.ownedBy", {
                name: team.find((one) => one.userId === row.ownerUserId)?.name
                  ?? t("pipelines.nobody"),
              })}
            </span>

            <EditDialog church={church} row={row} team={team} pending={pending} />

            <IconButton
              label={row.archived ? t("pipelines.on") : t("pipelines.turnOff")}
              variant="ghost"
              disabled={pending}
              onClick={() => run(() => switchPipeline(row.id, !row.archived, church))}
            >
              <Power />
            </IconButton>
          </div>

          {row.steps.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {row.steps.map((step, at) => (
                <span
                  key={step.id}
                  className="flex h-10 items-center gap-2 rounded-[10px] border border-line bg-canvas pr-1.5 pl-3"
                >
                  <span className="text-[11px] font-semibold text-fg-subtle tabular-nums">
                    {at + 1}
                  </span>
                  <span className="text-label font-medium text-fg">{step.name}</span>
                  <span className="text-[12px] text-fg-subtle">
                    {t("pipelines.dueIn", { count: String(step.dueDays) })}
                  </span>
                  <IconButton
                    label={t("pipelines.removeOne", { name: step.name })}
                    className="size-6 min-h-0 rounded-full [&_svg]:size-3.5"
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
            </div>
          ) : null}

          <AddStep
            pending={pending}
            onAdd={(name) =>
              writeSteps(row, [
                ...row.steps.map((one) => ({ id: one.id, name: one.name, dueDays: one.dueDays })),
                { id: "", name, dueDays: 7 },
              ])}
          />

          {row.description ? (
            <span className="text-fg-muted">{row.description}</span>
          ) : null}
        </section>
      ))}
    </div>
  );
}

/** R5.2. A step starts as a name. Its due day is set when it is edited. */
function AddStep({
  pending,
  onAdd,
}: {
  pending: boolean;
  onAdd: (name: string) => void;
}) {
  const [name, setName] = React.useState("");

  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onAdd(name.trim());
        setName("");
      }}
    >
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("pipelines.addStep")}
        aria-label={t("pipelines.step")}
        autoComplete="off"
        className="min-w-50 flex-1"
      />
      <Button type="submit" variant="secondary" disabled={pending}>
        {t("pipelines.addStep")}
      </Button>
    </form>
  );
}

function EditDialog({
  church,
  row,
  team,
  pending,
}: {
  church: string;
  row: PipelineRow;
  team: TeamMember[];
  pending: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [owner, setOwner] = React.useState(row.ownerUserId ?? NOBODY);
  const [steps, setSteps] = React.useState<{ key: string; id: string; name: string; days: string }[]>(
    row.steps.map((step) => ({
      key: step.id, id: step.id, name: step.name, days: String(step.dueDays),
    })),
  );
  const [saving, startTransition] = React.useTransition();

  const change = (key: string, patch: { name?: string; days?: string }) =>
    setSteps((all) => all.map((step) => (step.key === key ? { ...step, ...patch } : step)));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <IconButton
          label={t("action.edit")}
          variant="secondary"
        >
          <Pencil />
        </IconButton>
      </DialogTrigger>
      <DialogContent title={row.name} closeLabel={t("common.close")} className="max-w-xl">
        <form
          noValidate
          action={(data) => {
            data.set("church", church);
            data.set("id", row.id);
            data.set("ownerUserId", owner === NOBODY ? "" : owner);
            startTransition(async () => {
              const result = await savePipeline(data);
              setError(result.error);
              if (!result.error) {
                setOpen(false);
                router.refresh();
              }
            });
          }}
          className="flex flex-col gap-4"
        >
          {error ? <Banner tone="danger" title={t("pipelines.failed")}>{error}</Banner> : null}

          <Field label={t("pipelines.name")} required>
            <Input name="name" defaultValue={row.name} autoComplete="off" />
          </Field>

          <Field label={t("pipelines.description")}>
            <Textarea name="description" rows={2} defaultValue={row.description ?? ""} />
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
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("action.cancel")}
            </Button>
              <Button type="submit" disabled={pending || saving}>{t("action.save")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

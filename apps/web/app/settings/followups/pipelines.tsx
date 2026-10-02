"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Pencil, Power } from "lucide-react";
import {
  Badge, Banner, Button, IconButton, Card, Field, HueTag, Input, Separator, Textarea,
  Dialog, DialogTrigger, DialogContent,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  type Hue,
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

  return (
    <div className="flex flex-col gap-4" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("pipelines.failed")}>{error}</Banner> : null}

      {rows.map((row) => (
        <Card key={row.id} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex flex-wrap items-center gap-2">
              <HueTag hue={row.hue as Hue}>{row.name}</HueTag>
              {row.archived ? <Badge tone="neutral">{t("pipelines.off")}</Badge> : null}
              <span className="text-caption text-fg-muted">
                {row.steps.map((step) => t("pipelines.stepAfter", { name: step.name, count: String(step.dueDays) })).join(", ")}
              </span>
            </span>

            <span className="flex flex-wrap items-center gap-1">
              <EditDialog church={church} row={row} team={team} pending={pending} />
              <Button
                variant="ghost"
                disabled={pending}
                onClick={() => run(() => switchPipeline(row.id, !row.archived, church))}
              >
                <Power /> {row.archived ? t("pipelines.on") : t("pipelines.turnOff")}
              </Button>
            </span>
          </div>

          {row.description ? (
            <span className="text-[length:var(--d-text-body)] text-fg-muted">
              {row.description}
            </span>
          ) : null}
        </Card>
      ))}
    </div>
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

          <Field label={t("pipelines.name")}>
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
                  <Field label={t("pipelines.step")}>
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

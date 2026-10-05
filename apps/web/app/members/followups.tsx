"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Check, Undo2, LogOut } from "lucide-react";
import {
  Badge, Banner, Button, IconButton, Field, HueDot, HueTag, Input, Separator,
  Dialog, DialogTrigger, DialogContent, DialogFooter,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  type Hue,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { DateField } from "@/components/date-field";
import {
  startFollowUp, finishStep, undoStep, leaveFollowUp, addPersonTask, takeStep,
} from "./followup-actions";

export interface StepRow {
  id: string;
  title: string;
  dueOn: string | null;
  doneAt: string | null;
  outcome: string | null;
  mine: boolean;
}

export interface EntryRow {
  id: string;
  pipelineName: string;
  pipelineHue: string;
  status: string;
  startedOn: string;
  exitReason: string | null;
  steps: StepRow[];
}

export interface PipelineOption {
  id: string;
  name: string;
  hue: string;
}

const readable = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "long" });

/**
 * R5.1, R5.4 to R5.6. What the church is doing about this person.
 *
 * The steps are already written out with the day each is due, so the work here
 * is answering them. A step says what happened when it is ticked, because six
 * months later "we called her" is the record and "done" is not.
 */
export function FollowUps({
  church,
  personId,
  today,
  entries,
  pipelines,
  canEdit,
}: {
  church: string;
  personId: string;
  today: string;
  entries: EntryRow[];
  pipelines: PipelineOption[];
  canEdit: boolean;
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

  const open = entries.filter((entry) => entry.status === "open");
  const closed = entries.filter((entry) => entry.status !== "open");

  return (
    <div className="flex flex-col gap-6" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("followups.failed")}>{error}</Banner> : null}

      {open.map((entry) => (
        <Thread
          key={entry.id}
          church={church}
          entry={entry}
          today={today}
          canEdit={canEdit}
          pending={pending}
          run={run}
        />
      ))}

      {closed.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-label text-fg-muted">{t("followups.closed")}</h3>
          {closed.map((entry) => (
            <div key={entry.id} className="flex flex-wrap items-center gap-2">
              <HueTag hue={entry.pipelineHue as Hue}>{entry.pipelineName}</HueTag>
              <Badge tone="neutral">
                {entry.status === "done" ? t("followups.done") : t("followups.left")}
              </Badge>
              {entry.exitReason ? (
                <span className="text-caption text-fg-muted">{entry.exitReason}</span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {canEdit ? (
        <div>
          <StartDialog
            church={church}
            personId={personId}
            pipelines={pipelines}
            pending={pending}
            onDone={() => router.refresh()}
            onError={setError}
          />
        </div>
      ) : null}
    </div>
  );
}

/**
 * R5.1. One pipeline, as a thread.
 *
 * The steps are in order and dated, so they read down the page the way they
 * happen. The hue is the pipeline's own, on the rail and on the markers, which
 * is how two open at once stay apart at a glance.
 */
function Thread({
  church,
  entry,
  today,
  canEdit,
  pending,
  run,
}: {
  church: string;
  entry: EntryRow;
  today: string;
  canEdit: boolean;
  pending: boolean;
  run: (work: () => Promise<{ error?: string }>) => void;
}) {
  const hue = entry.pipelineHue as Hue;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex flex-wrap items-center gap-2">
          <HueTag hue={hue}>{entry.pipelineName}</HueTag>
          <span className="text-caption text-fg-muted">
            {t("followups.since", { day: readable(entry.startedOn) })}
          </span>
        </span>
        {canEdit ? (
          <LeaveDialog
            name={entry.pipelineName}
            pending={pending}
            onConfirm={(reason) => run(() => leaveFollowUp(entry.id, reason, church))}
          />
        ) : null}
      </div>

      <ol
        className="ml-[5px] flex flex-col gap-4 border-l pl-5"
        style={{ borderColor: `var(--hue-${hue}-tint)` }}
      >
        {entry.steps.map((step) => (
          <li key={step.id} className="relative">
            <Marker hue={hue} step={step} today={today} />
            <Step
              church={church}
              step={step}
              today={today}
              canEdit={canEdit}
              pending={pending}
              run={run}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Where the step sits on the rail: answered, waiting, or late. */
function Marker({ hue, step, today }: { hue: Hue; step: StepRow; today: string }) {
  const overdue = step.doneAt === null && step.dueOn !== null && step.dueOn < today;

  return (
    <span
      aria-hidden
      className="absolute -left-[26px] top-1.5 size-3 rounded-full border-2"
      style={
        step.doneAt
          ? { background: `var(--hue-${hue}-500)`, borderColor: `var(--hue-${hue}-500)` }
          : overdue
            ? { background: "var(--surface)", borderColor: "var(--danger)" }
            : { background: "var(--surface)", borderColor: `var(--hue-${hue}-500)` }
      }
    />
  );
}

/**
 * R5.6. The things to do about somebody that belong to no pipeline.
 *
 * Its own section, because that is what it is: a note to ring the school on
 * Thursday is not a stage of anything.
 */
export function PersonTasks({
  church,
  personId,
  today,
  tasks,
  canEdit,
}: {
  church: string;
  personId: string;
  today: string;
  tasks: StepRow[];
  canEdit: boolean;
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

  const open = tasks.filter((task) => task.doneAt === null);
  const done = tasks.filter((task) => task.doneAt !== null);

  return (
    <div className="flex flex-col gap-4" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("followups.tasks")}>{error}</Banner> : null}

      {[...open, ...done].length > 0 ? (
        <ul className="flex flex-col">
          {[...open, ...done].map((task, i) => (
            <li key={task.id}>
              {i > 0 ? <Separator className="my-2" /> : null}
              <Step
                church={church}
                step={task}
                today={today}
                canEdit={canEdit}
                pending={pending}
                run={run}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {canEdit ? (
        <div>
          <TaskDialog
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

function StartDialog({
  church,
  personId,
  pipelines,
  pending,
  onDone,
  onError,
}: {
  church: string;
  personId: string;
  pipelines: PipelineOption[];
  pending: boolean;
  onDone: () => void;
  onError: (error?: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [pipelineId, setPipelineId] = React.useState("");
  const [saving, startTransition] = React.useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus /> {t("followups.startAction")}</Button>
      </DialogTrigger>
      <DialogContent title={t("followups.startAction")} closeLabel={t("common.close")}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-label text-fg">{t("followups.start")}</span>
            <Select value={pipelineId} onValueChange={setPipelineId}>
              <SelectTrigger aria-label={t("followups.start")}><SelectValue /></SelectTrigger>
              <SelectContent>
                {pipelines.map((pipeline) => (
                  <SelectItem key={pipeline.id} value={pipeline.id}>
                    <span className="flex items-center gap-2">
                      <HueDot hue={pipeline.hue as Hue} />
                      {pipeline.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setOpen(false)}>{t("action.cancel")}</Button>
              <Button
              disabled={pending || saving || !pipelineId}
              onClick={() => {
                const data = new FormData();
                data.set("church", church);
                data.set("personId", personId);
                data.set("pipelineId", pipelineId);
                startTransition(async () => {
                  const result = await startFollowUp(data);
                  onError(result.error);
                  if (!result.error) {
                    setOpen(false);
                    setPipelineId("");
                    onDone();
                  }
                });
              }}
            >
              {t("followups.startAction")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Step({
  church,
  step,
  today,
  canEdit,
  pending,
  run,
}: {
  church: string;
  step: StepRow;
  today: string;
  canEdit: boolean;
  pending: boolean;
  run: (work: () => Promise<{ error?: string }>) => void;
}) {
  const overdue = step.doneAt === null && step.dueOn !== null && step.dueOn < today;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="min-w-0">
        <span
          className={
            step.doneAt
              ? "text-[length:var(--d-text-body)] text-fg-muted line-through"
              : "text-[length:var(--d-text-body)] text-fg"
          }
        >
          {step.title}
        </span>
        {step.dueOn ? (
          <span className={overdue ? "ml-2 text-caption text-danger-text" : "ml-2 text-caption text-fg-muted"}>
            {readable(step.dueOn)}
          </span>
        ) : null}
        {step.outcome ? (
          <span className="block text-caption text-fg-muted">{step.outcome}</span>
        ) : null}
      </span>

      {canEdit ? (
        step.doneAt ? (
          <IconButton
            label={t("followups.undo")}
            variant="ghost"
            disabled={pending}
            onClick={() => run(() => undoStep(step.id, church))}
          >
            <Undo2 />
          </IconButton>
        ) : (
          <span className="flex items-center gap-1">
            {step.mine ? null : (
              <Button
                variant="ghost"
                disabled={pending}
                onClick={() => run(() => takeStep(step.id, true, church))}
              >
                {t("followups.take")}
              </Button>
            )}
            <DoneDialog
              title={step.title}
              pending={pending}
              onConfirm={(outcome) => run(() => finishStep(step.id, outcome, church))}
            />
          </span>
        )
      ) : null}
    </div>
  );
}

function DoneDialog({
  title,
  pending,
  onConfirm,
}: {
  title: string;
  pending: boolean;
  onConfirm: (outcome: string | null) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [outcome, setOutcome] = React.useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <IconButton
          label={t("followups.doneAction")}
          variant="secondary"
        >
          <Check />
        </IconButton>
      </DialogTrigger>
      <DialogContent title={title} closeLabel={t("common.close")}>
        <div className="flex flex-col gap-4">
          <Field label={t("followups.outcome")}>
            <Input value={outcome} onChange={(e) => setOutcome(e.target.value)} autoFocus />
          </Field>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setOpen(false)}>{t("action.cancel")}</Button>
              <Button
              disabled={pending}
              onClick={() => {
                setOpen(false);
                onConfirm(outcome.trim() || null);
                setOutcome("");
              }}
            >
              {t("followups.doneAction")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LeaveDialog({
  name,
  pending,
  onConfirm,
}: {
  name: string;
  pending: boolean;
  onConfirm: (reason: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <IconButton
          label={t("followups.leave")}
          variant="ghost"
        >
          <LogOut />
        </IconButton>
      </DialogTrigger>
      <DialogContent alert title={t("followups.exitTitle", { name })}>
        <div className="flex flex-col gap-4">
          <Field label={t("followups.reason")} required>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>

          <DialogFooter>
            <Button variant="ghost" data-dismiss onClick={() => setOpen(false)}>
              {t("followups.exitKeep")}
            </Button>
            <Button
              variant="danger"
              disabled={pending || reason.trim() === ""}
              onClick={() => {
                setOpen(false);
                onConfirm(reason.trim());
                setReason("");
              }}
            >
              {t("followups.exitAction")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TaskDialog({
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
  const [saving, startTransition] = React.useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary"><Plus /> {t("followups.task")}</Button>
      </DialogTrigger>
      <DialogContent title={t("followups.task")} closeLabel={t("common.close")}>
        <form
          noValidate
          action={(data) => {
            data.set("church", church);
            data.set("personId", personId);
            startTransition(async () => {
              const result = await addPersonTask(data);
              onError(result.error);
              if (!result.error) {
                setOpen(false);
                onDone();
              }
            });
          }}
          className="flex flex-col gap-4"
        >
          <Field label={t("followups.what")} required>
            <Input name="title" autoComplete="off" autoFocus />
          </Field>
          <Field label={t("followups.due")}>
            <DateField name="dueOn" />
          </Field>
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

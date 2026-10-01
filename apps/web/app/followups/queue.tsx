"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import {
  Banner, Button, Card, EmptyState, Field, HueTag, Input, Separator,
  Dialog, DialogTrigger, DialogContent,
  type Hue,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { finishStep, takeStep } from "../people/followup-actions";

export interface QueueItem {
  id: string;
  personId: string;
  personName: string;
  title: string;
  pipelineName: string | null;
  pipelineHue: string | null;
  dueOn: string | null;
}

const readable = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "long" });

const addDays = (iso: string, days: number) => {
  const at = new Date(`${iso}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + days);
  return at.toISOString().slice(0, 10);
};

/**
 * R5.5. The queue.
 *
 * Three groups and no filters: what is late, what is this week, and what is
 * after that. Somebody opening this on a Monday morning wants to know what they
 * have already missed, and a dropdown does not answer that.
 */
export function Queue({
  church,
  today,
  mine,
  loose,
}: {
  church: string;
  today: string;
  mine: QueueItem[];
  loose: QueueItem[];
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

  const week = addDays(today, 7);
  const late = mine.filter((item) => item.dueOn !== null && item.dueOn < today);
  const soon = mine.filter(
    (item) => item.dueOn !== null && item.dueOn >= today && item.dueOn <= week,
  );
  const later = mine.filter((item) => item.dueOn === null || item.dueOn > week);

  return (
    <div className="flex flex-col gap-6" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("queue.failed")}>{error}</Banner> : null}

      {mine.length === 0 && loose.length === 0 ? (
        <EmptyState title={t("queue.none.title")} />
      ) : null}

      <Group
        label={t("queue.late")}
        tone="danger"
        items={late}
        church={church}
        pending={pending}
        run={run}
      />
      <Group label={t("queue.week")} items={soon} church={church} pending={pending} run={run} />
      <Group label={t("queue.later")} items={later} church={church} pending={pending} run={run} />

      {/* R5.5. Raised by a trigger and given to nobody, so it is not lost. */}
      {loose.length > 0 ? (
        <section className="flex flex-col gap-2">
          <span className="text-label text-fg-muted">{t("queue.nobody")}</span>
          <Card className="flex flex-col">
            {loose.map((item, i) => (
              <div key={item.id}>
                {i > 0 ? <Separator className="my-3" /> : null}
                <Row church={church} item={item} pending={pending} run={run} overdue={false}>
                  <Button
                    variant="secondary"
                    disabled={pending}
                    onClick={() => run(() => takeStep(item.id, true, church))}
                  >
                    {t("followups.take")}
                  </Button>
                </Row>
              </div>
            ))}
          </Card>
        </section>
      ) : null}
    </div>
  );
}

function Group({
  label,
  tone,
  items,
  church,
  pending,
  run,
}: {
  label: string;
  tone?: "danger";
  items: QueueItem[];
  church: string;
  pending: boolean;
  run: (work: () => Promise<{ error?: string }>) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <span className={tone === "danger" ? "text-label text-danger" : "text-label text-fg-muted"}>
        {label}
      </span>
      <Card className="flex flex-col">
        {items.map((item, i) => (
          <div key={item.id}>
            {i > 0 ? <Separator className="my-3" /> : null}
            <Row
              church={church}
              item={item}
              pending={pending}
              run={run}
              overdue={tone === "danger"}
            >
              <DoneDialog
                title={item.title}
                person={item.personName}
                pending={pending}
                onConfirm={(outcome) => run(() => finishStep(item.id, outcome, church))}
              />
            </Row>
          </div>
        ))}
      </Card>
    </section>
  );
}

function Row({
  church,
  item,
  overdue,
  children,
}: {
  church: string;
  item: QueueItem;
  pending: boolean;
  run: (work: () => Promise<{ error?: string }>) => void;
  overdue: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="flex min-w-0 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <Link
            href={`/people/${item.personId}?church=${church}`}
            className="text-[length:var(--d-text-body)] text-fg underline-offset-4 hover:underline"
          >
            {item.personName}
          </Link>
          {item.pipelineName ? (
            <HueTag hue={(item.pipelineHue ?? "sky") as Hue}>{item.pipelineName}</HueTag>
          ) : null}
        </span>
        <span className="text-caption text-fg-muted">
          {item.title}
          {item.dueOn ? (
            <span className={overdue ? "ml-2 text-danger" : "ml-2"}>{readable(item.dueOn)}</span>
          ) : null}
        </span>
      </span>
      {children}
    </div>
  );
}

function DoneDialog({
  title,
  person,
  pending,
  onConfirm,
}: {
  title: string;
  person: string;
  pending: boolean;
  onConfirm: (outcome: string | null) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [outcome, setOutcome] = React.useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary"><Check /> {t("followups.doneAction")}</Button>
      </DialogTrigger>
      <DialogContent title={`${title}: ${person}`} closeLabel={t("common.close")}>
        <div className="flex flex-col gap-4">
          <Field label={t("followups.outcome")}>
            <Input value={outcome} onChange={(e) => setOutcome(e.target.value)} autoFocus />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
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
            <Button variant="ghost" onClick={() => setOpen(false)}>{t("action.cancel")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

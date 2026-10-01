"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Merge, Undo2, ArrowRight } from "lucide-react";
import {
  Avatar, Badge, Button, Card, CardTitle, Separator, Banner, EmptyState,
  RadioGroup, RadioItem, Dialog, DialogTrigger, DialogContent, DialogFooter, cn,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { merge, undo, type MergeOutcome } from "./actions";

export interface PersonSide {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  preferredName: string | null;
  dateOfBirth: string | null;
  lifecycleStatus: string;
  membershipDate: string | null;
  firstVisitOn: string | null;
  email: string | null;
  phone: string | null;
}

export interface Pair {
  a: PersonSide;
  b: PersonSide;
  confidence: string;
  reason: string;
}

export interface PastMerge {
  id: string;
  winnerName: string;
  loserName: string;
  mergedAt: string;
  undoneAt: string | null;
  canUndo: boolean;
}

const CONFIDENCE_TONE = { certain: "danger", likely: "warning", possible: "neutral" } as const;

/** The fields a person chooses between. Contact details move across regardless. */
const FIELDS = [
  "firstName", "lastName", "preferredName",
  "dateOfBirth", "lifecycleStatus", "membershipDate", "firstVisitOn",
] as const;

type FieldKey = (typeof FIELDS)[number];

const LABELS: Record<FieldKey, string> = {
  firstName: "personForm.firstName",
  lastName: "personForm.lastName",
  preferredName: "personForm.preferredName",
  dateOfBirth: "personForm.dateOfBirth",
  lifecycleStatus: "personForm.status",
  membershipDate: "personForm.membershipDate",
  firstVisitOn: "personForm.firstVisit",
};

export function Review({
  church,
  pairs,
  history,
}: {
  church: string;
  pairs: Pair[];
  history: PastMerge[];
}) {
  return (
    <div className="flex flex-col gap-8">
      {pairs.length === 0 ? (
        <EmptyState title={t("merge.none.title")} body={t("merge.none.body")} />
      ) : (
        <div className="flex flex-col gap-4">
          {pairs.map((pair) => (
            <PairCard key={`${pair.a.id}:${pair.b.id}`} church={church} pair={pair} />
          ))}
        </div>
      )}

      {history.length > 0 ? <History church={church} history={history} /> : null}
    </div>
  );
}

const show = (value: string | null | undefined): string =>
  value ? value.replace(/_/g, " ") : t("person.notRecorded");

function PairCard({ church, pair }: { church: string; pair: Pair }) {
  const router = useRouter();
  const [winnerId, setWinnerId] = React.useState(pair.a.id);
  const [take, setTake] = React.useState<Partial<Record<FieldKey, "winner" | "loser">>>({});
  const [outcome, setOutcome] = React.useState<MergeOutcome>();
  const [pending, setPending] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  const formId = React.useId();

  const winner = winnerId === pair.a.id ? pair.a : pair.b;
  const loser = winnerId === pair.a.id ? pair.b : pair.a;

  // Choices belong to the surviving record, so switching which one survives
  // starts them again rather than silently inverting every answer.
  React.useEffect(() => setTake({}), [winnerId]);

  const submit = async (data: FormData) => {
    setPending(true);
    try {
      const result = await merge(data);
      setOutcome(result);
      if (!result.error) router.refresh();
    } finally {
      setPending(false);
    }
  };

  const differing = FIELDS.filter((f) => (winner[f] ?? "") !== (loser[f] ?? ""));

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle>{pair.a.name}</CardTitle>
        <Badge tone={CONFIDENCE_TONE[pair.confidence as keyof typeof CONFIDENCE_TONE] ?? "neutral"}>
          {t(pair.reason as never)}
        </Badge>
      </div>

      {outcome?.error ? (
        <Banner tone="danger" title={t("merge.failed")}>{t(outcome.error as never)}</Banner>
      ) : null}
      {outcome?.moved !== undefined ? (
        <Banner tone="success" title={t("merge.done", { count: outcome.moved })} />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {[pair.a, pair.b].map((side) => (
          <button
            key={side.id}
            type="button"
            onClick={() => setWinnerId(side.id)}
            aria-pressed={winnerId === side.id}
            className={cn(
              "flex flex-col gap-2 rounded-lg border p-3 text-left transition-colors duration-instant",
              winnerId === side.id
                ? "border-primary bg-primary-soft"
                : "border-line-strong bg-surface hover:bg-sunken",
            )}
          >
            <span className="flex items-center gap-2.5">
              <Avatar name={side.name} id={side.id} size="sm" />
              <span className="text-[length:var(--d-text-body)] text-fg">{side.name}</span>
            </span>
            <span className="text-caption text-fg-muted">
              {side.email ?? t("people.none")}
            </span>
            <span className="text-caption text-primary">
              {winnerId === side.id ? t("merge.keeping", { name: side.name }) : t("merge.keep")}
            </span>
          </button>
        ))}
      </div>

      <form noValidate id={formId} action={submit} className="flex flex-col gap-4">
        <input type="hidden" name="church" value={church} />
        <input type="hidden" name="winnerId" value={winner.id} />
        <input type="hidden" name="loserId" value={loser.id} />

        {differing.length > 0 ? (
          <>
            <Separator />
            <div className="flex flex-col gap-3">
              {differing.map((f) => (
                <fieldset key={f} className="flex flex-col gap-1.5">
                  <legend className="text-label text-fg">{t(LABELS[f] as never)}</legend>
                  <RadioGroup
                    name={`take.${f}`}
                    value={take[f] ?? "winner"}
                    onValueChange={(v) => setTake((prev) => ({ ...prev, [f]: v as "winner" | "loser" }))}
                    className="flex flex-wrap gap-x-6 gap-y-2"
                  >
                    <RadioItem value="winner">{show(winner[f])}</RadioItem>
                    <RadioItem value="loser">{show(loser[f])}</RadioItem>
                  </RadioGroup>
                </fieldset>
              ))}
            </div>
          </>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Dialog open={confirming} onOpenChange={setConfirming}>
            <DialogTrigger asChild>
              <Button type="button" loading={pending}>
                <Merge /> {t("merge.merge")}
              </Button>
            </DialogTrigger>
            <DialogContent
              alert
              title={t("merge.confirmTitle", { loser: loser.name, winner: winner.name })}
              description={t("merge.window")}
            >
              <p className="mb-5 text-[length:var(--d-text-body)] text-fg-muted">
                {t("merge.confirmBody", { loser: loser.name })}
              </p>
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  data-dismiss
                  onClick={() => setConfirming(false)}
                >
                  {t("merge.keepApart")}
                </Button>
                {/* form= reaches the form across the portal. DialogContent is
                    portaled to the body, so a submit button inside it is
                    outside its own form in the DOM and submits nothing. */}
                <Button type="submit" form={formId} disabled={pending} onClick={() => setConfirming(false)}>
                  <Merge /> {t("merge.merge")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="ghost" asChild>
            <Link href={`/people/${pair.a.id}?church=${church}`}>
              {pair.a.name} <ArrowRight />
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href={`/people/${pair.b.id}?church=${church}`}>
              {pair.b.name} <ArrowRight />
            </Link>
          </Button>
        </div>
      </form>
    </Card>
  );
}

function History({ church, history }: { church: string; history: PastMerge[] }) {
  const router = useRouter();
  const [outcome, setOutcome] = React.useState<MergeOutcome>();
  const [pending, setPending] = React.useState(false);

  const submit = async (data: FormData) => {
    setPending(true);
    try {
      const result = await undo(data);
      setOutcome(result);
      if (!result.error) router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <CardTitle>{t("merge.history")}</CardTitle>
      <Separator className="my-4" />

      {outcome?.error ? (
        <Banner tone="danger" title={t("merge.history")} className="mb-4">
          {t(outcome.error as never)}
        </Banner>
      ) : null}
      {outcome?.restored !== undefined ? (
        <Banner tone="success" title={t("merge.undoDone", { count: outcome.restored })} className="mb-4" />
      ) : null}

      <ul className="flex flex-col">
        {history.map((m, i) => (
          <li key={m.id}>
            {i > 0 ? <Separator className="my-3" /> : null}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2 text-[length:var(--d-text-body)] text-fg">
                  {m.loserName}
                  <ArrowRight className="size-3.5 text-fg-subtle" aria-hidden />
                  {m.winnerName}
                  {m.undoneAt ? <Badge tone="neutral">{t("merge.undone")}</Badge> : null}
                </span>
                <span className="text-caption text-fg-muted">{m.mergedAt}</span>
              </div>

              {m.canUndo ? (
                <form noValidate action={submit}>
                  <input type="hidden" name="church" value={church} />
                  <input type="hidden" name="mergeId" value={m.id} />
                  <Button type="submit" variant="ghost" loading={pending}>
                    <Undo2 /> {t("merge.undo")}
                  </Button>
                </form>
              ) : m.undoneAt ? null : (
                <span className="text-caption text-fg-subtle">{t("merge.expired")}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

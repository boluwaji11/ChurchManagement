"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, ArrowRight } from "lucide-react";
import { Badge, Button, Banner, cn } from "@hearth/ui";
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

/** The fields a person chooses between. Contact details move across regardless. */
const FIELDS = [
  "firstName", "lastName", "preferredName",
  "dateOfBirth", "lifecycleStatus", "membershipDate", "firstVisitOn",
] as const;

type FieldKey = (typeof FIELDS)[number];


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
        <div className="rounded-lg border border-line bg-surface p-7 text-center text-fg-muted">
          {t("merge.none.title")}
        </div>
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

/**
 * R2.8. One pair, as the design draws it.
 *
 * A row per field with both values side by side. Pressing a value keeps it, and
 * the name you keep is the record that survives, so there is no separate
 * "which one wins" question to answer first.
 */
function PairCard({ church, pair }: { church: string; pair: Pair }) {
  const router = useRouter();
  const [keepA, setKeepA] = React.useState(true);
  const [take, setTake] = React.useState<Partial<Record<FieldKey, "winner" | "loser">>>({});
  const [outcome, setOutcome] = React.useState<MergeOutcome>();
  const [pending, setPending] = React.useState(false);
  const formId = React.useId();

  const winner = keepA ? pair.a : pair.b;
  const loser = keepA ? pair.b : pair.a;

  // Choices belong to the surviving record, so switching which one survives
  // starts them again rather than silently inverting every answer.
  React.useEffect(() => setTake({}), [keepA]);

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

  /** Which side a field is currently taking its value from. */
  const sideOf = (f: FieldKey): "a" | "b" => {
    const from = take[f] ?? "winner";
    const fromWinner = from === "winner";
    return (keepA ? fromWinner : !fromWinner) ? "a" : "b";
  };

  const pick = (f: FieldKey, side: "a" | "b") => {
    const wantsWinner = keepA ? side === "a" : side === "b";
    setTake((prev) => ({ ...prev, [f]: wantsWinner ? "winner" : "loser" }));
  };

  const rows: { key: FieldKey | "name" | "email" | "phone"; label: string; a: string; b: string }[] = [
    { key: "name", label: t("people.column.person"), a: pair.a.name, b: pair.b.name },
    { key: "email", label: t("person.email"), a: show(pair.a.email), b: show(pair.b.email) },
    { key: "phone", label: t("person.phone"), a: show(pair.a.phone), b: show(pair.b.phone) },
    { key: "dateOfBirth", label: t("person.dateOfBirth"), a: show(pair.a.dateOfBirth), b: show(pair.b.dateOfBirth) },
    { key: "lifecycleStatus", label: t("person.status"), a: show(pair.a.lifecycleStatus), b: show(pair.b.lifecycleStatus) },
    { key: "firstVisitOn", label: t("person.firstVisit"), a: show(pair.a.firstVisitOn), b: show(pair.b.firstVisitOn) },
  ];

  const cell =
    "flex items-center gap-2 border-b border-sunken px-5 py-2.5 text-left text-[length:var(--d-text-body)]";

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
        <span className="font-semibold text-fg">
          {t("merge.pairTitle", { a: pair.a.name, b: pair.b.name })}
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[12px] font-medium"
          style={{ background: "var(--hue-amber-tint)", color: "var(--hue-amber-key)" }}
        >
          {t(pair.reason as never)}
        </span>
      </div>

      {outcome?.error ? (
        <Banner tone="danger" title={t("merge.failed")} className="m-5">
          {t(outcome.error as never)}
        </Banner>
      ) : null}

      <div className="grid [grid-template-columns:110px_minmax(0,1fr)_minmax(0,1fr)]">
        {rows.map((row) => {
          const chosen = row.key === "name" ? (keepA ? "a" : "b") : sideOf(row.key as FieldKey);
          const choose = (side: "a" | "b") =>
            row.key === "name"
              ? setKeepA(side === "a")
              : row.key === "email" || row.key === "phone"
                ? undefined
                : pick(row.key as FieldKey, side);
          const fixed = row.key === "email" || row.key === "phone";

          return (
            <React.Fragment key={row.key}>
              <div className="flex items-center border-b border-sunken px-5 py-2.5 text-[12px] text-fg-subtle">
                {row.label}
              </div>
              {(["a", "b"] as const).map((side) => (
                <button
                  key={side}
                  type="button"
                  disabled={fixed}
                  onClick={() => choose(side)}
                  aria-pressed={!fixed && chosen === side}
                  className={cn(
                    cell,
                    !fixed && chosen === side ? "bg-primary-soft text-fg" : "text-fg",
                    !fixed && chosen !== side && "hover:bg-sunken",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{side === "a" ? row.a : row.b}</span>
                  {!fixed && chosen === side ? (
                    <Check className="size-3.5 shrink-0 text-primary" aria-hidden />
                  ) : null}
                </button>
              ))}
            </React.Fragment>
          );
        })}
      </div>

      <form noValidate id={formId} action={submit} className="flex flex-wrap justify-end gap-2 bg-canvas px-5 py-3">
        <input type="hidden" name="church" value={church} />
        <input type="hidden" name="winnerId" value={winner.id} />
        <input type="hidden" name="loserId" value={loser.id} />
        {FIELDS.map((f) => (
          <input key={f} type="hidden" name={`take.${f}`} value={take[f] ?? "winner"} />
        ))}

        <Button type="button" variant="secondary" disabled={pending}>
          {t("merge.notSame")}
        </Button>
        <Button type="submit" loading={pending}>
          {t("merge.mergeInto", { name: winner.name })}
        </Button>
      </form>
    </section>
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
    <section className="rounded-lg border border-line bg-surface px-5 py-2">
      <div className="py-2 text-[13px] font-medium text-fg-subtle">{t("merge.history")}</div>

      {outcome?.error ? (
        <Banner tone="danger" title={t("merge.history")} className="mb-3">
          {t(outcome.error as never)}
        </Banner>
      ) : null}

      {history.map((m) => (
        <div key={m.id} className="flex items-center gap-3 border-t border-sunken py-2.5">
          <span className="flex-1 text-[length:var(--d-text-body)] text-fg">
            <span className="font-medium">{m.loserName}</span>{" "}
            <ArrowRight className="inline size-3.5 text-fg-subtle" aria-hidden />{" "}
            <span className="font-medium">{m.winnerName}</span>
            {m.undoneAt ? <Badge tone="neutral" className="ml-2">{t("merge.undone")}</Badge> : null}
          </span>
          <span className="text-[12px] text-fg-subtle">{m.mergedAt}</span>
          {m.canUndo ? (
            <form action={submit}>
              <input type="hidden" name="church" value={church} />
              <input type="hidden" name="mergeId" value={m.id} />
              <Button
                type="submit"
                variant="secondary"
                loading={pending}
                className="min-h-[30px] px-2.5 text-[13px]"
              >
                {t("merge.undo")}
              </Button>
            </form>
          ) : null}
        </div>
      ))}
    </section>
  );
}

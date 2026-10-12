"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Check, ArrowRight, ChevronLeft, ChevronRight, X, Undo2 } from "lucide-react";
import { Badge, Button, Banner, IconButton, Spinner, Working, cn } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { merge, mergeAll, undo, type MergeOutcome } from "./actions";
import { Step } from "@/components/pager";

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
  /** R2.8. When the record was written, for telling two copies apart. */
  addedOn: string;
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


/** R2.8. One person and every record that looks like them. */
export interface Group {
  members: PersonSide[];
  confidence: string;
  reason: string;
}

export function Review({
  church,
  group,
  at,
  total,
  back,
  on,
  history,
  pastPager,
}: {
  church: string;
  /** R2.8. The one group on screen. */
  group: Group | null;
  /** Which group, one-based, and how many there are. */
  at: number;
  total: number;
  /** The group before this one, and the one after. Null at either end. */
  back: string | null;
  on: string | null;
  history: PastMerge[];
  /** R24.6. The foot of the past merges, drawn on the server so its links are links. */
  pastPager?: React.ReactNode;
}) {
  const two = group && group.members.length === 2
    ? { a: group.members[0]!, b: group.members[1]!, confidence: group.confidence, reason: group.reason }
    : null;

  return (
    <div className="flex flex-col items-center gap-8">
      {!group || group.members.length < 2 ? (
        <div className="w-full max-w-[620px] rounded-lg border border-line bg-surface p-7 text-center text-fg-muted">
          {t("merge.none.title")}
        </div>
      ) : (
        <Deck at={at} total={total} back={back} on={on}>
          {/* Two records still get the field-by-field read, because with two
              there is a column each and a choice to make per row. More than
              two is one decision: which record survives. */}
          {two
            ? <PairCard key={`${two.a.id}:${two.b.id}`} church={church} pair={two} />
            : <ClusterCard key={group.members.map((m) => m.id).join(":")} group={group} />}
        </Deck>
      )}

      {history.length > 0 ? (
        <div className="w-full max-w-[880px]">
          <History history={history} pager={pastPager} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * R2.8, R24.6. One pair, with the way to the next one either side of it.
 *
 * The arrow keys move as well as the chevrons, because somebody clearing
 * thirty duplicates has a hand on the keyboard and not on the mouse.
 */
function Deck({
  at,
  total,
  back,
  on,
  children,
}: {
  at: number;
  total: number;
  back: string | null;
  on: string | null;
  children: React.ReactNode;
}) {
  const router = useRouter();

  React.useEffect(() => {
    const move = (event: KeyboardEvent) => {
      // Not while they are typing into something.
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;

      if (event.key === "ArrowLeft" && back) router.push(back);
      if (event.key === "ArrowRight" && on) router.push(on);
    };
    window.addEventListener("keydown", move);
    return () => window.removeEventListener("keydown", move);
  }, [router, back, on]);

  return (
    <div className="flex flex-col items-center gap-3">
      <span data-numeric className="text-[13px] text-fg-muted">
        {t("merge.position", { at, total })}
      </span>

      <div className="flex w-full items-center justify-center gap-3 sm:gap-5">
        <Step href={back ?? "#"} enabled={Boolean(back)} label={t("merge.previousPair")}>
          <ChevronLeft aria-hidden />
        </Step>

        <div className="w-full min-w-0 max-w-[620px]">{children}</div>

        <Step href={on ?? "#"} enabled={Boolean(on)} label={t("merge.nextPair")}>
          <ChevronRight aria-hidden />
        </Step>
      </div>
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
  /*
   * R2.8, R24.6. A merge moves every record off one person and onto another and
   * then redraws the page, which is long enough that the reader waits through
   * it. The panel sits over the screen for the whole of it, so the choices
   * cannot be changed under a merge that is already running.
   *
   * The flag comes from the form rather than from a `setPending` at the top of
   * the action. React runs a form action inside a transition, so state set in
   * there is held back until the action has finished and the spinner arrives
   * after the work it was meant to cover.
   */
  const [sending, setSending] = React.useState(false);
  const [redrawing, startRedraw] = React.useTransition();
  const busy = sending || redrawing;
  const formId = React.useId();

  const winner = keepA ? pair.a : pair.b;
  const loser = keepA ? pair.b : pair.a;

  // Choices belong to the surviving record, so switching which one survives
  // starts them again rather than silently inverting every answer.
  React.useEffect(() => setTake({}), [keepA]);

  const submit = async (data: FormData) => {
    setOutcome(await merge(data));
  };

  /* Asked for once the merge has landed, so the panel stays up until the page
     this card is leaving has redrawn without it. */
  React.useEffect(() => {
    if (!outcome || outcome.error) return;
    startRedraw(() => router.refresh());
  }, [outcome, router]);

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
    { key: "name", label: t("members.column.person"), a: pair.a.name, b: pair.b.name },
    { key: "email", label: t("person.email"), a: show(pair.a.email), b: show(pair.b.email) },
    { key: "phone", label: t("person.phone"), a: show(pair.a.phone), b: show(pair.b.phone) },
    { key: "dateOfBirth", label: t("person.dateOfBirth"), a: show(pair.a.dateOfBirth), b: show(pair.b.dateOfBirth) },
    { key: "lifecycleStatus", label: t("person.status"), a: show(pair.a.lifecycleStatus), b: show(pair.b.lifecycleStatus) },
    { key: "firstVisitOn", label: t("person.firstVisit"), a: show(pair.a.firstVisitOn), b: show(pair.b.firstVisitOn) },
  ];

  const cell =
    "flex cursor-pointer items-center gap-2 border-b border-sunken px-3 py-2.5 text-left "
    + "text-[length:var(--d-text-body)] disabled:cursor-default sm:px-5";

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-surface">
      <Working open={busy} label={t("merge.working")} />

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
        <Banner tone="danger" className="m-5">
          {t(outcome.error as never)}
        </Banner>
      ) : null}

      <div
        aria-busy={busy}
        className={cn(
          "grid grid-cols-2 sm:[grid-template-columns:110px_minmax(0,1fr)_minmax(0,1fr)]",
          busy && "pointer-events-none opacity-60",
        )}
      >
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
              <div className="col-span-2 flex flex-col justify-center border-sunken px-3 pt-3 pb-1 text-[12px] text-fg-subtle sm:col-span-1 sm:border-b sm:px-5 sm:py-2.5">
                {row.label}
                {/* R2.5. Said under the label, so the two values keep the
                    columns every other row lines up with. */}
                {fixed ? <span className="text-fg-subtle/70">{t("merge.bothKept")}</span> : null}
              </div>
              {fixed ? (
                /* Both are kept, so there is nothing to press. Drawn as the
                   same two cells so the grid does not shift. */
                (["a", "b"] as const).map((side) => (
                  <div key={side} className={cn(cell, "cursor-default text-fg")}>
                    <span className="min-w-0 flex-1 truncate">
                      {side === "a" ? row.a : row.b}
                    </span>
                  </div>
                ))
              ) : (["a", "b"] as const).map((side) => (
                <button
                  key={side}
                  type="button"
                  disabled={fixed || busy}
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

        <Submitting onChange={setSending} />

        <Button type="button" variant="secondary" disabled={busy}>
          {t("merge.notSame")}
        </Button>
        <Button type="submit" loading={busy} disabled={busy}>
          {t("merge.mergeInto", { name: winner.name })}
        </Button>
      </form>
    </section>
  );
}

/**
 * R2.8. One person and every copy of them, as one decision.
 *
 * Five records of one person make ten pairs, and walking ten pairs to fix one
 * person is what leaves the duplicates in the directory. So the group is the
 * card: choose which record survives, drop any that turn out to be somebody
 * else, and the rest move onto it in one press.
 */
function ClusterCard({ group }: { group: Group }) {
  const router = useRouter();
  const [keep, setKeep] = React.useState(group.members[0]!.id);
  const [out, setOut] = React.useState<string[]>([]);
  const [outcome, setOutcome] = React.useState<MergeOutcome>();
  const [sending, setSending] = React.useState(false);
  const [redrawing, startRedraw] = React.useTransition();
  const busy = sending || redrawing;
  const formId = React.useId();

  const winner = group.members.find((m) => m.id === keep)!;
  const losers = group.members.filter((m) => m.id !== keep && !out.includes(m.id));

  const submit = async (data: FormData) => {
    setOutcome(await mergeAll(data));
  };

  React.useEffect(() => {
    if (!outcome || outcome.error) return;
    startRedraw(() => router.refresh());
  }, [outcome, router]);

  const drop = (id: string) =>
    setOut((was) => (was.includes(id) ? was.filter((one) => one !== id) : [...was, id]));

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-surface">
      <Working open={busy} label={t("merge.working")} />

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
        <span className="font-semibold text-fg">
          {t("merge.cluster.title", { count: group.members.length, name: winner.name })}
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[12px] font-medium"
          style={{ background: "var(--hue-amber-tint)", color: "var(--hue-amber-key)" }}
        >
          {t(group.reason as never)}
        </span>
      </div>

      {outcome?.error ? (
        <Banner tone="danger" className="m-5">{t(outcome.error as never)}</Banner>
      ) : null}

      <ul
        aria-busy={busy}
        className={cn("m-0 list-none p-0", busy && "pointer-events-none opacity-60")}
      >
        {group.members.map((one) => {
          const left = out.includes(one.id);
          const kept = one.id === keep;

          return (
            <li
              key={one.id}
              className="flex items-center gap-3 border-b border-sunken px-3 py-2.5 last:border-0 sm:px-5"
            >
              <button
                type="button"
                disabled={left || busy}
                onClick={() => setKeep(one.id)}
                aria-pressed={kept}
                className={cn(
                  "flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-[var(--d-radius-control)] px-2 py-1.5 text-left",
                  kept && !left && "bg-primary-soft",
                  left && "cursor-default opacity-50 line-through",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "grid size-4 shrink-0 place-items-center rounded-full border",
                    kept && !left ? "border-primary" : "border-line",
                  )}
                >
                  {kept && !left ? <span className="size-2 rounded-full bg-primary" /> : null}
                </span>

                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium text-fg">{one.name}</span>
                  <span className="truncate text-[12px] text-fg-subtle">
                    {[one.email, one.phone, one.lifecycleStatus.replace(/_/g, " "),
                      t("merge.cluster.added", { date: one.addedOn })]
                      .filter(Boolean).join(" \u00b7 ")}
                  </span>
                </span>

                {kept && !left ? (
                  <Check aria-hidden className="size-4 shrink-0 text-primary" />
                ) : null}
              </button>

              {/* R2.8. A record that turns out to be somebody else leaves the
                  group rather than the church. */}
              <IconButton
                type="button"
                variant="ghost"
                disabled={busy || (kept && !left)}
                label={left ? t("merge.cluster.restore") : t("merge.notSame")}
                onClick={() => drop(one.id)}
              >
                {left ? <Undo2 /> : <X />}
              </IconButton>
            </li>
          );
        })}
      </ul>

      <form
        id={formId}
        action={submit}
        className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3.5"
      >
        <input type="hidden" name="winnerId" value={winner.id} />
        <input type="hidden" name="loserIds" value={losers.map((one) => one.id).join(",")} />
        <Submitting onChange={setSending} />
        <Button type="submit" disabled={busy || losers.length === 0}>
          {t("merge.cluster.action", { count: losers.length })}
        </Button>
      </form>
    </section>
  );
}

function History({
  history, pager,
}: { history: PastMerge[]; pager?: React.ReactNode }) {
  const router = useRouter();
  const [outcome, setOutcome] = React.useState<MergeOutcome>();
  const [, startRedraw] = React.useTransition();

  const submit = async (data: FormData) => {
    setOutcome(await undo(data));
  };

  React.useEffect(() => {
    if (!outcome || outcome.error) return;
    startRedraw(() => router.refresh());
  }, [outcome, router]);

  return (
    <section id="past" className="rounded-lg border border-line bg-surface px-5 py-2">
      <div className="py-2 text-[13px] font-medium text-fg-subtle">{t("merge.history")}</div>

      {outcome?.error ? (
        <Banner tone="danger" className="mb-3">
          {t(outcome.error as never)}
        </Banner>
      ) : null}

      {history.map((m) => (
        <div key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-sunken py-2.5">
          <span className="min-w-0 flex-1 text-[length:var(--d-text-body)] text-fg">
            <span className="font-medium">{m.loserName}</span>{" "}
            <ArrowRight className="inline size-3.5 text-fg-subtle" aria-hidden />{" "}
            <span className="font-medium">{m.winnerName}</span>
            {m.undoneAt ? <Badge tone="neutral" className="ml-2">{t("merge.undone")}</Badge> : null}
          </span>
          <span className="text-[12px] text-fg-subtle">{m.mergedAt}</span>
          {m.canUndo ? (
            <form action={submit}>
              <input type="hidden" name="mergeId" value={m.id} />
              {/* R24.6. Each row is a form of its own, so the one that was
                  pressed is the one that spins. */}
              <UndoButton />
            </form>
          ) : null}
        </div>
      ))}

      {pager ? <div className="-mx-5">{pager}</div> : null}
    </section>
  );
}


/**
 * R24.6. Reports the form it sits in up to the card around it.
 *
 * `useFormStatus` is the only honest reading of whether a form action is still
 * running: it is set by React as the submit begins, where a `setState` written
 * at the top of the action is held back until the action has already finished.
 */
function Submitting({ onChange }: { onChange: (on: boolean) => void }) {
  const { pending } = useFormStatus();

  React.useEffect(() => {
    onChange(pending);
  }, [pending, onChange]);

  return null;
}

/** R24.6. The Undo on one past merge, busy for as long as its own form is. */
/**
 * R24.11. Undo on every row it can be done on, so it carries the icon alone.
 *
 * The label is the accessible name and the tooltip both, so the action keeps
 * its word for whoever needs it.
 */
function UndoButton() {
  const { pending } = useFormStatus();

  return (
    <IconButton
      type="submit"
      variant="secondary"
      disabled={pending}
      label={t("merge.undo")}
    >
      {pending ? <Spinner /> : <Undo2 />}
    </IconButton>
  );
}

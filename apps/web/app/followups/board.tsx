"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Move, Plus, X } from "lucide-react";
import {
  Banner, Button, Combobox, Field, IconButton, Input, Spinner,
  Dialog, DialogTrigger, DialogContent, DialogFooter,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Searching } from "@/components/searching";
import { moveToStage, leaveFollowUp } from "../members/followup-actions";
import { addToStage, findPeople } from "./actions";
import { dragShadow } from "@/lib/drag-shadow";

export interface BoardCard {
  entryId: string;
  memberId: string;
  personSlug: string;
  who: string;
  owner: string;
  /** The step they are waiting on, which is the column they sit in. */
  stepId: string | null;
  stage: string;
  late: boolean;
  /** The day the step is due, which is the order a column reads in. */
  dueOn: string | null;
}

export interface BoardStage {
  id: string;
  label: string;
  hue: string;
}

/**
 * R5.5. The follow-up board.
 *
 * A column per stage of the pipeline, and a card is dragged into the next one
 * when it moves. Dragging a card marks the step it was waiting on as done,
 * which is the same thing a church means by "she has been contacted".
 *
 * Columns wrap at 210px, so four stages are four columns on a desk and a
 * readable stack on a phone.
 */
export function Board({
  church,
  pipelineId,
  stages,
  cards,
}: {
  church: string;
  /** The pipeline somebody added from a column enters. */
  pipelineId: string;
  stages: BoardStage[];
  cards: BoardCard[];
}) {
  const router = useRouter();
  const [dragging, setDragging] = React.useState<string | null>(null);
  const [over, setOver] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string>();
  /** Which card is being taken off, so its own mark spins. */
  const [leaving, setLeaving] = React.useState<string | null>(null);

  const drop = (stageId: string) => {
    setOver(null);
    const card = cards.find((c) => c.entryId === dragging);
    setDragging(null);
    if (!card || card.stage === stageId) return;

    // The stage a card lands on is the step it is then waiting on, and the one
    // at the end means every step is answered. Dragging two columns along
    // answers two; dragging back leaves them to be answered again.
    const target = stages.findIndex((s) => s.id === stageId);
    if (target < 0) return;
    const position = stageId === "done" ? stages.length : Number(stageId);

    startTransition(async () => {
      const result = await moveToStage(card.entryId, position, church);
      setError(result.error);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {error ? <Banner tone="danger" title={t("board.failed")}>{error}</Banner> : null}

      <div
        className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(210px,100%),1fr))]"
        aria-busy={pending}
      >
      {stages.map((stage) => {
        const inStage = cards.filter((c) => c.stage === stage.id);
        return (
          <div
            key={stage.id}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(stage.id);
            }}
            onDragLeave={() => setOver((was) => (was === stage.id ? null : was))}
            onDrop={() => drop(stage.id)}
            className="rounded-lg p-2"
            style={{ background: over === stage.id ? "var(--color-line)" : "var(--color-board)" }}
          >
            <div
              className="mb-2 flex items-center gap-2 px-1.5 pt-1 pb-2.5 text-[13px] font-medium"
              style={{ color: `var(--hue-${stage.hue}-key)` }}
            >
              <span
                className="size-2 rounded-full"
                style={{ background: `var(--hue-${stage.hue}-500)` }}
              />
              {stage.label}
              <span className="ml-auto text-fg-subtle">{inStage.length}</span>
            </div>

            <div className="flex flex-col gap-2 sm:min-h-[140px]">
              {inStage.map((card) => (
                <div
                  key={card.entryId}
                  draggable
                  onDragStart={(e) => { dragShadow(e); setDragging(card.entryId); }}
                  onDragEnd={() => setDragging(null)}
                  className="relative flex cursor-grab flex-col gap-0.5 rounded-md bg-surface p-3 shadow-[0_1px_2px_rgb(0_0_0/0.10),0_2px_6px_rgb(0_0_0/0.08)] hover:shadow-[0_2px_4px_rgb(0_0_0/0.12),0_6px_14px_rgb(0_0_0/0.14)] active:cursor-grabbing"
                >
                  <span className="flex items-start justify-between gap-2">
                    <Link
                      href={`/members/${card.personSlug}?church=${church}`}
                      className="font-medium text-fg after:absolute after:inset-0 after:content-['']"
                    >
                      {card.who}
                    </Link>

                    {/* R5.4. Taking somebody off the board, which the server
                        will not do without a reason, so the box asks for one. */}
                    <span className="relative z-10">
                      <LeaveCard
                        name={card.who}
                        pending={pending}
                        busy={leaving === card.entryId}
                        onConfirm={(reason) => {
                          setLeaving(card.entryId);
                          startTransition(async () => {
                            const result = await leaveFollowUp(card.entryId, reason, church);
                            setError(result.error);
                            setLeaving(null);
                            router.refresh();
                          });
                        }}
                      />
                    </span>
                  </span>
                  {/* R5.5. A date that has gone says so, because the whole
                      board is read to find what is overdue. */}
                  <span
                    className={`mt-1 text-[12px] ${
                      card.late ? "font-medium text-danger-text" : "text-fg-subtle"
                    }`}
                  >
                    {card.owner}
                  </span>
                </div>
              ))}

              <AddToStage
                church={church}
                pipelineId={pipelineId}
                position={stage.id === "done" ? stages.length : Number(stage.id)}
                pending={pending}
                onAdded={() => router.refresh()}
                onError={setError}
              />
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * R5.4. Adding somebody where they already are.
 *
 * Every column takes a name, the way a board does, so a church that has
 * already made the call puts the person in the column that says so rather than
 * at the start and then dragging them along.
 */
function AddToStage({
  church,
  pipelineId,
  position,
  pending,
  onAdded,
  onError,
}: {
  church: string;
  pipelineId: string;
  position: number;
  pending: boolean;
  onAdded: () => void;
  onError: (error?: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [members, setPeople] = React.useState<{ id: string; name: string }[]>([]);
  const [saving, startSaving] = React.useTransition();
  const [searching, setSearching] = React.useState(false);
  // An answer that arrives after a newer one was asked for is dropped.
  const ticket = React.useRef(0);

  /*
   * Nothing is fetched until a name is being typed. A church of five hundred
   * opening this and seeing the first fifty surnames in the alphabet learns
   * nothing, and the only answer worth showing is the one being looked for.
   */
  const look = React.useCallback(
    (search: string) => {
      setQuery(search);
      if (!search.trim()) {
        ticket.current++;
        setSearching(false);
        setPeople([]);
        return;
      }
      const mine = ++ticket.current;
      setSearching(true);
      void findPeople(pipelineId, search, church).then((people) => {
        if (mine !== ticket.current) return;
        setSearching(false);
        setPeople(people);
      });
    },
    [pipelineId, church],
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setQuery("");
          setPeople([]);
          setOpen(true);
        }}
        disabled={pending}
        className="flex min-h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[12px] text-fg-subtle hover:bg-surface hover:text-fg"
      >
        <Plus className="size-3.5" aria-hidden /> {t("board.add")}
      </button>
    );
  }

  return (
    <Searching on={searching}>
      <Combobox
        options={members.map((one) => ({ value: one.id, label: one.name }))}
        value=""
        onChange={(memberId) => {
          if (!memberId) return;
          startSaving(async () => {
            const result = await addToStage(pipelineId, memberId, position, church);
            onError(result.error);
            if (!result.error) {
              setOpen(false);
              onAdded();
            }
          });
        }}
        onQueryChange={look}
        placeholder={t("board.findPerson")}
        emptyLabel={query.trim() ? t("board.noPerson") : t("board.typeName")}
        clearLabel={t("date.clear")}
        aria-label={t("board.add")}
        disabled={saving}
        className="text-[13px]"
      />
    </Searching>
  );
}

/** The one line that says the board can be dragged. */
export function DragHint() {
  return (
    <span className="hidden items-center gap-1.5 text-[12px] text-fg-subtle sm:flex">
      <Move className="size-3.5" aria-hidden /> {t("board.dragHint")}
    </span>
  );
}

/**
 * R5.4. Taking somebody off the board.
 *
 * The same question the record page asks, in the same words: a church that
 * stops following somebody up has a reason, and the reason is what the next
 * person reading the record needs.
 */
function LeaveCard({
  name,
  pending,
  busy,
  onConfirm,
}: {
  name: string;
  pending: boolean;
  busy: boolean;
  onConfirm: (reason: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogTrigger asChild>
        <IconButton
          label={t("followups.leave")}
          variant="ghost"
          className="size-7 min-h-0 [&_svg]:size-4"
        >
          {busy ? <Spinner label={t("followups.leave")} /> : <X />}
        </IconButton>
      </DialogTrigger>
      <DialogContent alert title={t("followups.exitTitle", { name })}>
        <div className="flex flex-col gap-4">
          <Field label={t("followups.reason")} required>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>

          <DialogFooter>
            <Button variant="ghost" data-dismiss onClick={() => close(false)}>
              {t("followups.exitKeep")}
            </Button>
            <Button
              variant="danger"
              disabled={pending || reason.trim() === ""}
              onClick={() => {
                onConfirm(reason.trim());
                close(false);
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

"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Move, Plus } from "lucide-react";
import { Banner, Combobox } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { moveToStage } from "../members/followup-actions";
import { addToStage, findPeople } from "./actions";

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
        className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]"
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
            className="rounded-lg border border-line p-2"
            style={{ background: over === stage.id ? "var(--color-line)" : "var(--color-sunken)" }}
          >
            <div
              className="mb-2 flex items-center gap-2 border-b border-line px-1.5 pt-1 pb-2.5 text-[13px] font-medium"
              style={{ color: `var(--hue-${stage.hue}-key)` }}
            >
              <span
                className="size-2 rounded-full"
                style={{ background: `var(--hue-${stage.hue}-500)` }}
              />
              {stage.label}
              <span className="ml-auto text-fg-subtle">{inStage.length}</span>
            </div>

            <div className="flex min-h-[140px] flex-col gap-2">
              {inStage.map((card) => (
                <div
                  key={card.entryId}
                  draggable
                  onDragStart={() => setDragging(card.entryId)}
                  onDragEnd={() => setDragging(null)}
                  className="flex cursor-grab flex-col gap-0.5 rounded-md border border-line bg-surface p-3"
                >
                  <Link
                    href={`/members/${card.personSlug}?church=${church}`}
                    className="font-medium text-fg"
                  >
                    {card.who}
                  </Link>
                  <span className="mt-1 text-[12px] text-fg-subtle">{card.owner}</span>
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

  /*
   * Nothing is fetched until a name is being typed. A church of five hundred
   * opening this and seeing the first fifty surnames in the alphabet learns
   * nothing, and the only answer worth showing is the one being looked for.
   */
  const look = React.useCallback(
    (search: string) => {
      setQuery(search);
      if (!search.trim()) {
        setPeople([]);
        return;
      }
      void findPeople(pipelineId, search, church).then(setPeople);
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
        className="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[12px] text-fg-subtle hover:bg-surface hover:text-fg"
      >
        <Plus className="size-3.5" aria-hidden /> {t("board.add")}
      </button>
    );
  }

  return (
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
  );
}

/** The one line that says the board can be dragged. */
export function DragHint() {
  return (
    <span className="flex items-center gap-1.5 text-[12px] text-fg-subtle">
      <Move className="size-3.5" aria-hidden /> {t("board.dragHint")}
    </span>
  );
}

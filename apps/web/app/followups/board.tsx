"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Move } from "lucide-react";
import { t } from "@hearth/i18n";
import { finishStep } from "../people/followup-actions";

export interface BoardCard {
  entryId: string;
  personId: string;
  who: string;
  why: string;
  owner: string;
  /** The step they are waiting on, which is the column they sit in. */
  stepId: string | null;
  stage: string;
  late: boolean;
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
  stages,
  cards,
}: {
  church: string;
  stages: BoardStage[];
  cards: BoardCard[];
}) {
  const router = useRouter();
  const [dragging, setDragging] = React.useState<string | null>(null);
  const [over, setOver] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const drop = (stageId: string) => {
    setOver(null);
    const card = cards.find((c) => c.entryId === dragging);
    setDragging(null);
    if (!card || !card.stepId || card.stage === stageId) return;

    // Only forward. A card dragged back would have to un-complete a step, and
    // undoing one is its own decision rather than a side effect of a drag.
    const from = stages.findIndex((s) => s.id === card.stage);
    const to = stages.findIndex((s) => s.id === stageId);
    if (to <= from) return;

    startTransition(async () => {
      await finishStep(card.stepId!, church);
      router.refresh();
    });
  };

  return (
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
            className="rounded-lg p-2"
            style={{ background: over === stage.id ? "var(--color-line)" : "var(--color-sunken)" }}
          >
            <div
              className="flex items-center gap-2 px-1.5 pt-1 pb-2.5 text-[13px] font-medium"
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
                    href={`/people/${card.personId}?church=${church}`}
                    className="font-medium text-fg"
                  >
                    {card.who}
                  </Link>
                  <span className="text-[12px] text-fg-muted">{card.why}</span>
                  <span className="mt-1 text-[12px] text-fg-subtle">{card.owner}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
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

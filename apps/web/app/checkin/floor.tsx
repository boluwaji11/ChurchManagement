"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Banner } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Empty } from "@/components/empty";
import type { Board, RoomRosterEntry, ArrivingChild } from "@connectapp/db";
import { floor, place } from "./actions";

/** What the server knew when the page was drawn. */
export interface FloorStart {
  board: Board | null;
  rosters: Record<string, RoomRosterEntry[]>;
  waiting: ArrivingChild[];
}

export interface FloorRoom {
  roomId: string;
  /** The ages the room takes, where the church has said. */
  ages: string | null;
}

/**
 * R8.14, R8.18. Children's ministry during a service, on one screen.
 *
 * Who is here and not yet in a class down the left, every class across the
 * rest, and a child moves between them by being dragged. The numbers are
 * counted on every read, because a tally that drifts is one somebody trusts at
 * the moment they should be walking to the room.
 *
 * It pulls itself every twenty seconds, so a supervisor holding a tablet never
 * has to remember to refresh it.
 */
const REFRESH_SECONDS = 20;

export function Floor({
  church,
  occurrenceId,
  rooms,
  start,
}: {
  church: string;
  occurrenceId: string;
  rooms: FloorRoom[];
  start: FloorStart;
}) {
  const [data, setData] = React.useState(start);
  const [error, setError] = React.useState<string>();
  const [dragging, setDragging] = React.useState<string | null>(null);
  const [over, setOver] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const pull = React.useCallback(async () => {
    const result = await floor(occurrenceId, church);
    setError(result.error);
    if (result.board) {
      setData({
        board: result.board,
        rosters: result.rosters ?? {},
        waiting: result.waiting ?? [],
      });
    }
  }, [occurrenceId, church]);

  React.useEffect(() => {
    const timer = setInterval(() => void pull(), REFRESH_SECONDS * 1000);
    return () => clearInterval(timer);
  }, [pull]);

  const drop = (visitId: string | null, roomId: string | null) => {
    setOver(null);
    setDragging(null);
    if (!visitId) return;

    startTransition(async () => {
      const result = await place(visitId, roomId, church);
      setError(result.error);
      await pull();
    });
  };

  const ageOf = (roomId: string) => rooms.find((r) => r.roomId === roomId)?.ages ?? null;

  if (!data.board || data.board.rooms.length === 0) {
    return <Empty icon="room" title={t("board.noRooms.title")} body={t("board.noRooms.body")} />;
  }

  return (
    <div className="flex flex-col gap-4" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("board.failed")}>{error}</Banner> : null}

      <div className="grid gap-5 [grid-template-columns:1fr] md:[grid-template-columns:minmax(240px,300px)_1fr]">
        {/* The children who are here and have not been put in a class. The
            dashes say it is a place things are dragged out of. */}
        <section
          onDragOver={(e) => {
            e.preventDefault();
            setOver("");
          }}
          onDragLeave={() => setOver((was) => (was === "" ? null : was))}
          onDrop={() => drop(dragging, null)}
          className="flex min-h-[200px] flex-col gap-2.5 rounded-xl border border-dashed border-line-strong bg-sunken p-4"
          style={over === "" ? { borderColor: "var(--color-fg-subtle)" } : undefined}
        >
          {data.waiting.length > 0 ? (
            <h2 className="text-[13px] font-medium text-fg-muted">
              {t("board.arriving")} · {data.waiting.length}
            </h2>
          ) : null}

          {data.waiting.length === 0 ? (
            <p className="m-auto px-4 text-center text-[13px] text-fg-subtle">
              {t("board.noneArriving")}
            </p>
          ) : null}

          {data.waiting.map((child) => (
            <article
              key={child.visitId}
              draggable
              tabIndex={0}
              role="button"
              aria-label={child.name}
              aria-pressed={dragging === child.visitId}
              onDragStart={() => setDragging(child.visitId)}
              onDragEnd={() => setDragging(null)}
              onKeyDown={(e) => {
                // Picked up with a key, put down on a class with a key, so the
                // screen works for somebody who cannot drag.
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setDragging((was) => (was === child.visitId ? null : child.visitId));
                }
              }}
              className="flex cursor-grab items-center gap-2.5 rounded-md border border-line bg-surface px-3 py-2.5"
              style={
                dragging === child.visitId ? { borderColor: "var(--color-fg-subtle)" } : undefined
              }
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-fg">{child.name}</div>
                <div className="truncate text-[12px] text-fg-subtle">
                  {child.household
                    ? t("board.childOf", {
                        age: child.age ?? "",
                        household: child.household,
                      })
                    : child.age === null
                      ? ""
                      : t("board.childAge", { age: child.age })}
                </div>
              </div>
              {child.allergies ? <AllergyChip note={child.allergies} /> : null}
              {child.code ? (
                <span data-numeric className="font-mono text-[12px] text-fg-muted">
                  {child.code}
                </span>
              ) : null}
            </article>
          ))}
        </section>

        <div className="grid content-start gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
          {data.board.rooms.map((room) => {
            const kids = (data.rosters[room.roomId] ?? []).filter((k) => k.checkedOutAt === null);
            const filled =
              room.capacity && room.capacity > 0
                ? Math.min(100, Math.round((room.present / room.capacity) * 100))
                : 0;

            return (
              <section
                key={room.roomId}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(room.roomId);
                }}
                onDragLeave={() => setOver((was) => (was === room.roomId ? null : was))}
                onDrop={() => drop(dragging, room.roomId)}
                onKeyDown={(e) => {
                  if (dragging && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    drop(dragging, room.roomId);
                  }
                }}
                tabIndex={0}
                className="flex min-h-[180px] flex-col gap-3 rounded-xl border p-4"
                style={{
                  background: `var(--hue-${room.hue}-tint)`,
                  borderColor:
                    over === room.roomId ? `var(--hue-${room.hue}-500)` : "transparent",
                }}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-[20px] leading-6 text-fg">
                      {room.name}
                    </h2>
                    <div className="truncate text-[12px] text-fg-muted">
                      {[ageOf(room.roomId), room.ratio ? t("board.ratio", { n: room.ratio }) : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  <span
                    data-numeric
                    className="font-mono text-[14px]"
                    style={{ color: `var(--hue-${room.hue}-key)` }}
                  >
                    {room.capacity === null
                      ? room.present
                      : t("board.ofCapacity", {
                          present: room.present,
                          capacity: room.capacity,
                        })}
                  </span>
                </div>

                {room.capacity === null ? null : (
                  <div
                    className="h-1.5 overflow-hidden rounded-full"
                    style={{ background: "oklch(1 0 0 / 0.6)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${filled}%`, background: `var(--hue-${room.hue}-500)` }}
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  {kids.map((child) => (
                    <div
                      key={child.visitId}
                      draggable
                      tabIndex={0}
                      role="button"
                      aria-label={child.name}
                      aria-pressed={dragging === child.visitId}
                      onDragStart={() => setDragging(child.visitId)}
                      onDragEnd={() => setDragging(null)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          setDragging((was) => (was === child.visitId ? null : child.visitId));
                        }
                      }}
                      className="flex cursor-grab items-center gap-2 rounded-sm bg-surface px-2.5 py-[7px] text-[13px]"
                    >
                      <span className="min-w-0 flex-1 truncate font-medium text-fg">
                        {child.name}
                      </span>
                      {child.allergies || child.medicalNote ? (
                        <AllergyChip
                          note={[child.allergies, child.medicalNote].filter(Boolean).join(" · ")}
                        />
                      ) : null}
                      {child.code ? (
                        <span data-numeric className="font-mono text-[12px] text-fg-subtle">
                          {child.code}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * R8.10. What somebody has to know before they take the child.
 *
 * White on the danger red rather than a tint, because this is the one thing on
 * the screen that must be read at a glance across a corridor.
 */
function AllergyChip({ note }: { note: string }) {
  return (
    <span className="flex shrink-0 items-center gap-1 rounded-sm bg-danger px-1.5 py-0.5 text-[11px] font-semibold text-white">
      <AlertTriangle className="size-3" aria-hidden />
      <span className="sr-only">{t("checkin.allergies")}: </span>
      {note}
    </span>
  );
}

"use client";

import * as React from "react";
import {
  ChevronDown, Database, GripVertical, ListFilter, Plus, SlidersHorizontal, X,
} from "lucide-react";
import {
  Button, IconButton, Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  DatePicker, Popover, PopoverTrigger, PopoverContent, Tabs, TabsList, TabsTrigger, TabsContent,
} from "@connectapp/ui";
import {
  SUBJECTS, SUBJECT_KEYS, OPERATORS, BARE_OPERATORS, GROUPED_VIEWS, fieldOf,
  cleanSpec,
  type ReportPage, type ReportTile, type SubjectKey, type Condition,
} from "@connectapp/db/rules";
import { t } from "@connectapp/i18n";
import { previewPage, saveReport, type ReportResultish } from "./actions";
import { FieldsPanel } from "./fields";
import { Gallery } from "./gallery";
import { Wells } from "./wells";
import { Format } from "./format";
import { Canvas } from "./canvas";
import type { Part } from "../plot";
import { read } from "../read";

/** The date picker's words, said once rather than at every call. */
const DATE_LABELS = () => ({
  open: t("date.open"),
  clear: t("date.clear"),
  previousMonth: t("date.previousMonth"),
  nextMonth: t("date.nextMonth"),
  month: t("date.month"),
  year: t("date.year"),
  today: t("date.today"),
});

/** What a control on the toolbar looks like. */
const CHIP =
  "flex min-h-8 w-auto shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[10px]"
  + " border-primary bg-primary-soft px-2.5 text-[13px] font-medium text-fg shadow-none"
  + " [&>span]:flex-none [&>span]:overflow-visible";

/** The same chip, for a control nothing has been chosen on yet. */
const CHIP_QUIET =
  "flex min-h-8 w-auto shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[10px]"
  + " border-transparent bg-transparent px-2.5 text-[13px] font-medium text-fg-muted shadow-none"
  + " hover:bg-sunken [&>span]:flex-none [&>span]:overflow-visible";

/** When it last saved, short enough to sit in a header. */
const stamp = (at: number): string =>
  new Date(at).toLocaleString(undefined, {
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  });

/** A fresh visual, filling half the width under whatever is already there. */
function freshTile(subject: SubjectKey, id: string, y: number): ReportTile {
  return {
    ...cleanSpec({ subject }),
    id,
    title: "",
    place: { x: 0, y, w: 6, h: 4 },
  };
}

/**
 * R18.12. Building a report.
 *
 * A page of visuals rather than one, because one question rarely has one
 * picture. The fields are down the left, the page is in the middle, and the
 * visual that is selected has its gallery and its wells on the right. That is
 * where every tool of this kind puts them, and a church that has seen one of
 * those will not have to be told twice.
 *
 * Every choice is a key from the catalogue. Dragging is a way of choosing one,
 * not a way of writing a new one.
 */
export function Builder({
  church,
  saved,
}: {
  church: string;
  saved: { id: string; slug: string; name: string; spec: ReportPage } | null;
}) {
  const [page, setPage] = React.useState<ReportPage>(
    saved?.spec ?? { tiles: [freshTile("members", "1", 0)] },
  );
  const [chosen, setChosen] = React.useState<string>(saved?.spec.tiles[0]?.id ?? "1");
  const [results, setResults] = React.useState<Record<string, ReportResultish | undefined>>({});
  const [running, setRunning] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  // Which pane is open, and which section of Format the visual sent us to.
  const [tab, setTab] = React.useState("build");
  const [part, setPart] = React.useState<Part | null>(null);
  const held = React.useRef<number | null>(null);

  const tile = page.tiles.find((one) => one.id === chosen) ?? page.tiles[0]!;
  const def = SUBJECTS[tile.subject];
  const counted = Boolean(tile.groupBy);

  // Every visual redraws together, a beat behind, so dragging a date around
  // does not send a query per keystroke.
  React.useEffect(() => {
    let live = true;
    setRunning(true);
    const timer = setTimeout(() => {
      void previewPage(page.tiles, church).then((answer) => {
        if (!live) return;
        setResults(answer);
        setRunning(false);
      });
    }, 350);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [page, church]);

  const first = React.useRef(true);
  React.useEffect(() => {
    if (!saved) return;
    if (first.current) {
      first.current = false;
      return;
    }

    let live = true;
    const timer = setTimeout(() => {
      setSaving(true);
      void saveReport({ id: saved.id, name: saved.name, spec: page }, church).then((back) => {
        if (!live) return;
        setSaving(false);
        if (back.error) {
          setError(back.error);
          return;
        }
        setError(null);
        setSavedAt(Date.now());
      });
    }, 900);

    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [page, saved, church]);

  const change = (patch: Partial<ReportTile>) =>
    setPage((was) => ({
      tiles: was.tiles.map((one) => (one.id === tile.id ? { ...one, ...patch } : one)),
    }));

  const setFilter = (at: number, patch: Partial<Condition>) =>
    change({ filters: tile.filters.map((one, i) => (i === at ? { ...one, ...patch } : one)) });

  const moveFilter = (from: number, to: number) => {
    if (to < 0 || to >= tile.filters.length || to === from) return;
    const next = [...tile.filters];
    const [one] = next.splice(from, 1);
    next.splice(to, 0, one!);
    change({ filters: next });
  };

  const addTile = () => {
    const id = String(Date.now());
    const bottom = Math.max(0, ...page.tiles.map((one) => one.place.y + one.place.h));
    setPage((was) => ({ tiles: [...was.tiles, freshTile(tile.subject, id, bottom)] }));
    setChosen(id);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-end gap-3">
        {/* It saves itself, so it says when it last did rather than asking
            anybody to remember. */}
        <span role="status" className="text-caption text-fg-subtle tabular-nums">
          {saving
            ? t("report.saving")
            : savedAt
              ? t("report.savedAt", { when: stamp(savedAt) })
              : ""}
        </span>
        <Button variant="secondary" onClick={addTile}>
          <Plus /> {t("report.addVisual")}
        </Button>
      </div>

      {error ? <p role="status" className="text-[13px] text-danger-text">{error}</p> : null}

      <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
      {/* The toolbar belongs to the selected visual, and leads the frame. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-3 py-2">
        <Select
          value={tile.subject}
          onValueChange={(value) =>
            change({ ...cleanSpec({ subject: value as SubjectKey }), title: tile.title })}
        >
          <SelectTrigger className={CHIP} aria-label={t("report.step.subject")}>
            <Database className="size-4 shrink-0" aria-hidden />
            <span className="shrink-0 text-fg-muted">{t("report.step.subject")}</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUBJECT_KEYS.map((key) => (
              <SelectItem key={key} value={key}>{t(SUBJECTS[key].label as never)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Rule />

        <Tray
          icon={ListFilter}
          label={t("report.step.filters")}
          value={tile.filters.length > 0 ? String(tile.filters.length) : undefined}
          on={tile.filters.length > 0}
          wide
        >
          <span className="text-[15px] font-bold text-fg">{t("report.step.filters")}</span>

          {tile.filters.length === 0 ? (
            <p className="text-[13px] text-fg-muted">{t("report.allOf")}</p>
          ) : null}

          <ol className="flex flex-col gap-1.5">
            {tile.filters.map((one, at) => {
              const field = fieldOf(tile.subject, one.field);
              const ops = field ? OPERATORS[field.kind] : [];
              return (
                <React.Fragment key={at}>
                  {at > 0 ? (
                    <li className="flex items-center gap-2 pl-1">
                      <span className="h-px w-3 bg-line" aria-hidden />
                      <button
                        type="button"
                        onClick={() => change({ join: tile.join === "and" ? "or" : "and" })}
                        title={t("report.joinSwap")}
                        aria-label={t("report.joinSwap")}
                        className="cursor-pointer rounded-full border border-line-strong bg-surface px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-fg-muted transition-colors hover:border-fg-subtle hover:text-fg"
                      >
                        {t(tile.join === "and" ? "report.join.and" : "report.join.or")}
                      </button>
                      <span className="h-px flex-1 bg-line" aria-hidden />
                    </li>
                  ) : null}

                  <li
                    draggable
                    onDragStart={() => { held.current = at; }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (held.current !== null) moveFilter(held.current, at);
                      held.current = null;
                    }}
                    className="flex items-start gap-1.5 rounded-[10px] border border-line bg-sunken p-1.5"
                  >
                    <button
                      type="button"
                      aria-label={t("report.moveFilter")}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowUp") { e.preventDefault(); moveFilter(at, at - 1); }
                        if (e.key === "ArrowDown") { e.preventDefault(); moveFilter(at, at + 1); }
                      }}
                      className="mt-1 shrink-0 cursor-grab rounded-sm p-0.5 text-fg-subtle hover:text-fg-muted"
                    >
                      <GripVertical className="size-3.5" aria-hidden />
                    </button>

                    <div className="grid min-w-0 flex-1 grid-cols-2 gap-1.5">
                      <Select
                        value={one.field}
                        onValueChange={(value) => {
                          const next = fieldOf(tile.subject, value);
                          setFilter(at, {
                            field: value,
                            op: next ? OPERATORS[next.kind][0]! : "is",
                            value: "",
                          });
                        }}
                      >
                        <SelectTrigger className="min-h-8 min-w-0 text-[13px]" aria-label={t("report.field")}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent searchLabel={t("report.findField")}>
                          {def.fields.map((f) => (
                            <SelectItem key={f.key} value={f.key}>{t(f.label as never)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={one.op} onValueChange={(value) => setFilter(at, { op: value, value: "" })}>
                        <SelectTrigger className="min-h-8 min-w-0 text-[13px]" aria-label={t("report.operator")}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ops.map((op) => (
                            <SelectItem key={op} value={op}>{t(`report.op.${op}` as never)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {BARE_OPERATORS.has(one.op) ? null : (
                        <div className="col-span-2">
                          {field?.kind === "choice" ? (
                            <Select value={one.value} onValueChange={(value) => setFilter(at, { value })}>
                              <SelectTrigger className="min-h-8 w-full text-[13px]" aria-label={t("report.value")}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(field.choices ?? []).map((choice) => (
                                  <SelectItem key={choice} value={choice}>
                                    {t(`report.choice.${choice}` as never)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : field?.kind === "date" && one.op !== "lastDays" ? (
                            <DatePicker
                              value={one.value}
                              onChange={(value) => setFilter(at, { value: value ?? "" })}
                              aria-label={t("report.value")}
                              labels={DATE_LABELS()}
                            />
                          ) : (
                            <Input
                              value={one.value}
                              inputMode={
                                field?.kind === "number" || one.op === "lastDays" ? "numeric" : "text"
                              }
                              onChange={(e) => setFilter(at, { value: e.target.value })}
                              aria-label={t("report.value")}
                              placeholder={t("report.value")}
                              className="min-h-8 w-full text-[13px]"
                            />
                          )}
                        </div>
                      )}
                    </div>

                    <IconButton
                      label={t("report.removeFilter")}
                      variant="ghost"
                      className="size-7 min-h-0 shrink-0 [&_svg]:size-3.5"
                      onClick={() => change({ filters: tile.filters.filter((_, i) => i !== at) })}
                    >
                      <X />
                    </IconButton>
                  </li>
                </React.Fragment>
              );
            })}
          </ol>

          <Button
            variant="secondary"
            className="min-h-8 self-start px-2.5 text-[13px]"
            onClick={() => {
              const first = def.fields[0]!;
              change({
                filters: [
                  ...tile.filters,
                  { field: first.key, op: OPERATORS[first.kind][0]!, value: "" },
                ],
              });
            }}
          >
            <Plus /> {t("report.addFilter")}
          </Button>
        </Tray>

        <Rule />

        {counted ? (
          <>
            <Select
              value={tile.topN ? String(tile.topN) : "all"}
              onValueChange={(value) => change({ topN: value === "all" ? null : Number(value) })}
            >
              <SelectTrigger className={tile.topN ? CHIP : CHIP_QUIET} aria-label={t("report.topN")}>
                <span className="shrink-0 text-fg-muted">{t("report.topN")}</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("report.topAll")}</SelectItem>
                {[5, 10, 20].map((n) => (
                  <SelectItem key={n} value={String(n)}>{String(n)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

          </>
        ) : (
          <>
            <Select
              value={tile.sort?.field ?? "none"}
              onValueChange={(value) =>
                change({
                  sort: value === "none" ? null : { field: value, dir: tile.sort?.dir ?? "desc" },
                })}
            >
              <SelectTrigger className={tile.sort ? CHIP : CHIP_QUIET} aria-label={t("report.sort")}>
                <SlidersHorizontal className="size-4 shrink-0" aria-hidden />
                <span className="shrink-0 text-fg-muted">{t("report.sort")}</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent searchLabel={t("report.findField")}>
                <SelectItem value="none">{t("report.sortDefault")}</SelectItem>
                {def.fields.map((one) => (
                  <SelectItem key={one.key} value={one.key}>{t(one.label as never)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {tile.sort ? (
              <Select
                value={tile.sort.dir}
                onValueChange={(value) =>
                  change({ sort: { field: tile.sort!.field, dir: value as "asc" | "desc" } })}
              >
                <SelectTrigger className={CHIP} aria-label={t("report.order")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">{t("report.order.desc")}</SelectItem>
                  <SelectItem value="asc">{t("report.order.asc")}</SelectItem>
                </SelectContent>
              </Select>
            ) : null}
          </>
        )}

      </div>

      <div className="flex flex-wrap items-stretch">
        <div className="flex w-full shrink-0 flex-col border-line p-4 lg:w-[240px] lg:border-r">
          <FieldsPanel subject={tile.subject} />
        </div>

        {/* The workspace, sunken so the page reads as a page and the panes
            beside it read as the tools. */}
        <div className="min-w-[320px] flex-1 bg-sunken p-5">
          <Canvas
            tiles={page.tiles}
            results={results}
            running={running}
            selected={tile.id}
            onSelect={setChosen}
            onPart={(id, which) => {
              setChosen(id);
              setPart(which);
              setTab("format");
            }}
            onRename={(id, title) =>
              setPage((was) => ({
                tiles: was.tiles.map((one) => (one.id === id ? { ...one, title } : one)),
              }))}
            onMove={(id, place) =>
              setPage((was) => ({
                tiles: was.tiles.map((one) => (one.id === id ? { ...one, place } : one)),
              }))}
            onRemove={(id) =>
              setPage((was) => ({
                tiles: was.tiles.length > 1
                  ? was.tiles.filter((one) => one.id !== id)
                  : was.tiles,
              }))}
            onDuplicate={(id) =>
              setPage((was) => {
                const from = was.tiles.find((one) => one.id === id);
                if (!from) return was;
                const copy = {
                  ...from,
                  id: String(Date.now()),
                  place: { ...from.place, y: from.place.y + from.place.h },
                };
                return { tiles: [...was.tiles, copy] };
              })}
          />
        </div>

        <div className="w-full shrink-0 border-line p-4 lg:w-[252px] lg:border-l">
          <Tabs value={tab} onValueChange={(value) => { setTab(value); setPart(null); }}>
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="build" className="flex-1">{t("report.tab.build")}</TabsTrigger>
              <TabsTrigger value="format" className="flex-1">{t("report.tab.format")}</TabsTrigger>
            </TabsList>

            <TabsContent value="build" className="flex flex-col gap-4">
              <Gallery
                view={tile.view}
                groupBy={tile.groupBy}
                answers={results[tile.id]?.chart?.length ?? results[tile.id]?.rows.length ?? 0}
                onPick={(view) =>
                  change(
                    GROUPED_VIEWS.has(view) && !tile.groupBy
                      ? {
                          view,
                          groupBy: def.fields.find((one) => one.groupable)?.key ?? null,
                        }
                      : { view },
                  )}
              />

              <div className="border-t border-line pt-4">
                <Wells tile={tile} onChange={change} />
              </div>
            </TabsContent>

            <TabsContent value="format">
              <Format
                tile={tile}
                part={part}
                series={(
                  results[tile.id]?.grid
                    ? results[tile.id]!.grid!.series.map((one) => one.name)
                    : (results[tile.id]?.chart ?? []).map((one) => one.label)
                ).map(read)}
                onChange={change}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      </div>
    </div>
  );
}

/** What rules one group of toolbar controls off from the next. */
const Rule = () => <span className="h-6 w-px shrink-0 bg-line" aria-hidden />;

/**
 * One toolbar control: a button that says what it is set to, and a tray of the
 * controls that set it.
 */
function Tray({
  icon: Icon,
  label,
  value,
  on,
  wide,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  /** What it is currently set to, shown on the button. */
  value?: string;
  on?: boolean;
  wide?: boolean;
  children: React.ReactNode;
}) {
  const lit = on ?? Boolean(value);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={
            lit
              ? "flex min-h-8 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[10px] border border-primary bg-primary-soft px-2.5 text-[13px] font-medium text-fg"
              : "flex min-h-8 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[10px] border border-transparent px-2.5 text-[13px] font-medium text-fg-muted hover:bg-sunken hover:text-fg"
          }
        >
          <Icon className="size-4" />
          {label}
          {value ? <span className="text-fg-subtle">{value}</span> : null}
          <ChevronDown className="size-3.5 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className={wide ? "w-[min(94vw,520px)]" : undefined}>
        {children}
      </PopoverContent>
    </Popover>
  );
}

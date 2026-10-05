"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3, ChartColumnBig, ChartLine, ChartPie, ChevronDown, Database,
  GripVertical, Hash, ListFilter, Plus, SlidersHorizontal, Table2, X,
} from "lucide-react";
import {
  Button, IconButton, Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  DatePicker, Spinner,
  Popover, PopoverTrigger, PopoverContent,
} from "@hearth/ui";
import {
  SUBJECTS, SUBJECT_KEYS, OPERATORS, BARE_OPERATORS, GROUPED_VIEWS, fieldOf,
  type ReportSpec, type SubjectKey, type Condition, type MeasureKind, type View,
} from "@hearth/db/rules";
import { t } from "@hearth/i18n";
import { preview, saveReport, type PreviewResult } from "./actions";
import { Answer } from "../answer";
import { FieldsPanel } from "./fields";
import { Shelf, type Pill } from "./shelf";

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

const blank = (subject: SubjectKey): ReportSpec => ({
  subject,
  filters: [],
  join: "and",
  columns: SUBJECTS[subject].fields.slice(0, 4).map((one) => one.key),
  groupBy: null,
  measure: null,
  sort: null,
  view: "table",
});

const VIEW_ICONS = {
  table: Table2,
  number: Hash,
  bar: ChartColumnBig,
  rows: BarChart3,
  donut: ChartPie,
  line: ChartLine,
} as const;

const VIEW_ORDER: View[] = ["table", "number", "bar", "rows", "donut", "line"];

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

/**
 * R18.12. Building a report.
 *
 * The controls are a toolbar across the top, each one a tray that opens over
 * the page, and the output has the whole canvas underneath. This is the shape
 * every tool that does this well has settled on, and the reason is the same
 * every time: the output is the thing being worked on, and controls stacked
 * down a column push it off the screen.
 *
 * Every choice is a key from the catalogue. There is no box anywhere in here
 * that sends text to the database, and nothing that asks a church to pick a
 * table or a join.
 */
export function Builder({
  church,
  saved,
}: {
  church: string;
  saved: { id: string; name: string; spec: ReportSpec } | null;
}) {
  const router = useRouter();

  const [spec, setSpec] = React.useState<ReportSpec>(saved?.spec ?? blank("members"));
  const [name, setName] = React.useState(saved?.name ?? "");
  const [answer, setAnswer] = React.useState<PreviewResult | null>(null);
  const [running, setRunning] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const held = React.useRef<number | null>(null);

  const def = SUBJECTS[spec.subject];

  React.useEffect(() => {
    let live = true;
    setRunning(true);
    const timer = setTimeout(() => {
      void preview(spec, church).then((result) => {
        if (!live) return;
        setAnswer(result);
        setRunning(false);
      });
    }, 350);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [spec, church]);

  const set = (patch: Partial<ReportSpec>) => setSpec((was) => ({ ...was, ...patch }));

  const setFilter = (at: number, patch: Partial<Condition>) =>
    setSpec((was) => ({
      ...was,
      filters: was.filters.map((one, i) => (i === at ? { ...one, ...patch } : one)),
    }));

  const moveFilter = (from: number, to: number) =>
    setSpec((was) => {
      if (to < 0 || to >= was.filters.length || to === from) return was;
      const next = [...was.filters];
      const [one] = next.splice(from, 1);
      next.splice(to, 0, one!);
      return { ...was, filters: next };
    });

  const result = answer?.result ?? null;
  const counted = Boolean(spec.groupBy);

  const groupField = spec.groupBy ? fieldOf(spec.subject, spec.groupBy) : null;
  const measureName = !spec.measure
    ? null
    : spec.measure.kind === "members"
      ? t("report.measure.members")
      : spec.measure.kind === "sum" && spec.measure.field
        ? t("report.measure.sum", { field: t(fieldOf(spec.subject, spec.measure.field)!.label as never) })
        : spec.measure.kind === "average" && spec.measure.field
          ? t("report.measure.average", { field: t(fieldOf(spec.subject, spec.measure.field)!.label as never) })
          : t("report.measure.rows", { rows: t(def.rowLabel as never) });

  const groupPill: Pill[] = groupField
    ? [{ key: groupField.key, label: t(groupField.label as never) }]
    : [];

  const valuePills: Pill[] =
    counted && measureName
      ? [{ key: "measure", label: measureName }]
      : [];

  const save = () => {
    setSaving(true);
    setError(null);
    void saveReport({ id: saved?.id, name, spec }, church).then((back) => {
      setSaving(false);
      if (back.error) {
        setError(back.error);
        return;
      }
      router.push(`/reports/custom/${back.slug}?church=${church}`);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("report.namePlaceholder")}
          aria-label={t("report.name")}
          className="min-w-[240px] max-w-[460px] flex-1 font-display text-[20px] md:text-[20px]"
        />
        <Button loading={saving} disabled={!name.trim()} onClick={save}>
          {saved ? t("action.save") : t("report.save")}
        </Button>
      </div>

      {error ? <p role="status" className="text-[13px] text-danger-text">{error}</p> : null}

      {/* The toolbar. Every control is a tray, so none of them costs the
          output any height. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[14px] border border-line bg-surface px-3 py-2">
        {/* The real dropdown rather than a tray of buttons that look like
            one. Every control on this bar is now the component the rest of the
            product uses. */}
        <Select value={spec.subject} onValueChange={(value) => setSpec(blank(value as SubjectKey))}>
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
          value={spec.filters.length > 0 ? String(spec.filters.length) : undefined}
          on={spec.filters.length > 0}
          wide
        >
          <span className="text-[15px] font-bold text-fg">{t("report.step.filters")}</span>

          {spec.filters.length === 0 ? (
            <p className="text-[13px] text-fg-muted">{t("report.allOf")}</p>
          ) : null}

          <ol className="flex flex-col gap-1.5">
            {spec.filters.map((one, at) => {
              const field = fieldOf(spec.subject, one.field);
              const ops = field ? OPERATORS[field.kind] : [];
              return (
                <React.Fragment key={at}>
                  {at > 0 ? (
                    <li className="flex items-center gap-2 pl-1">
                      <span className="h-px w-3 bg-line" aria-hidden />
                      <button
                        type="button"
                        onClick={() => set({ join: spec.join === "and" ? "or" : "and" })}
                        title={t("report.joinSwap")}
                        aria-label={t("report.joinSwap")}
                        className="cursor-pointer rounded-full border border-line-strong bg-surface px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-fg-muted transition-colors hover:border-fg-subtle hover:text-fg"
                      >
                        {t(spec.join === "and" ? "report.join.and" : "report.join.or")}
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
                          const next = fieldOf(spec.subject, value);
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
                      onClick={() => set({ filters: spec.filters.filter((_, i) => i !== at) })}
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
              set({
                filters: [
                  ...spec.filters,
                  { field: first.key, op: OPERATORS[first.kind][0]!, value: "" },
                ],
              });
            }}
          >
            <Plus /> {t("report.addFilter")}
          </Button>
        </Tray>

        <Rule />

        {/* The sort is still one choice, so it is still a dropdown. */}
        {counted ? null : (
          <>
            <Select
              value={spec.sort?.field ?? "none"}
              onValueChange={(value) =>
                set({
                  sort: value === "none" ? null : { field: value, dir: spec.sort?.dir ?? "desc" },
                })}
            >
              <SelectTrigger
                className={spec.sort ? CHIP : CHIP_QUIET}
                aria-label={t("report.sort")}
              >
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

            {spec.sort ? (
              <Select
                value={spec.sort.dir}
                onValueChange={(value) =>
                  set({ sort: { field: spec.sort!.field, dir: value as "asc" | "desc" } })}
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

        <span className="flex-1" />

        <Rule />

        {/* The visualization, as the icons themselves. It is a choice of six,
            and six icons read faster than a menu that hides five of them. */}
        <div className="flex items-center gap-0.5 rounded-[10px] bg-sunken p-0.5">
          {VIEW_ORDER.filter((view) => counted || !GROUPED_VIEWS.has(view)).map((view) => {
            const Icon = VIEW_ICONS[view];
            const on = spec.view === view;
            return (
              <button
                key={view}
                type="button"
                onClick={() => set({ view })}
                aria-pressed={on}
                aria-label={t(`report.view.${view}` as never)}
                title={t(`report.view.${view}` as never)}
                className={
                  on
                    ? "grid size-8 cursor-pointer place-items-center rounded-lg bg-surface text-fg shadow-sm"
                    : "grid size-8 cursor-pointer place-items-center rounded-lg text-fg-subtle hover:text-fg"
                }
              >
                <Icon className="size-4" aria-hidden />
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <FieldsPanel subject={spec.subject} />

        <div className="flex min-w-[320px] flex-1 flex-col gap-4">
          {/* The shelves. What is on them is what the report asks. */}
          <div className="grid gap-3 rounded-[14px] border border-line bg-surface p-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
            <Shelf
              title={t("report.shelf.rows")}
              empty={t("report.dropDimension")}
              pills={groupPill}
              takes={(key) => {
                const field = fieldOf(spec.subject, key);
                return Boolean(field?.groupable);
              }}
              onDrop={(key) =>
                set({
                  groupBy: key,
                  measure: spec.measure ?? { kind: "rows" },
                  view: GROUPED_VIEWS.has(spec.view) ? spec.view : "bar",
                })}
              onRemove={() => set({ groupBy: null, measure: null, view: "table" })}
            />

            <Shelf
              title={t("report.shelf.values")}
              empty={counted ? t("report.dropMeasure") : t("report.valuesNeedGroup")}
              pills={valuePills}
              takes={(key) => {
                if (!counted) return false;
                const field = fieldOf(spec.subject, key);
                return Boolean(field?.numeric);
              }}
              onDrop={(key) => set({ measure: { kind: "sum", field: key } })}
              onRemove={() => set({ measure: { kind: "rows" } })}
            >
              {counted ? (
                <Select
                  value={
                    spec.measure?.kind === "sum" || spec.measure?.kind === "average"
                      ? `${spec.measure.kind}:${spec.measure.field}`
                      : (spec.measure?.kind ?? "rows")
                  }
                  onValueChange={(value) => {
                    const [kind, field] = value.split(":") as [MeasureKind, string | undefined];
                    set({ measure: field ? { kind, field } : { kind } });
                  }}
                >
                  <SelectTrigger className="min-h-8 text-[13px]" aria-label={t("report.measure")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent searchLabel={t("report.findMeasure")}>
                    <SelectItem value="rows">
                      {t("report.measure.rows", { rows: t(def.rowLabel as never) })}
                    </SelectItem>
                    <SelectItem value="people">{t("report.measure.members")}</SelectItem>
                    {def.fields.filter((one) => one.numeric).map((one) => (
                      <SelectItem key={`sum:${one.key}`} value={`sum:${one.key}`}>
                        {t("report.measure.sum", { field: t(one.label as never) })}
                      </SelectItem>
                    ))}
                    {def.fields.filter((one) => one.numeric).map((one) => (
                      <SelectItem key={`average:${one.key}`} value={`average:${one.key}`}>
                        {t("report.measure.average", { field: t(one.label as never) })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </Shelf>

            {counted ? null : (
              <Shelf
                title={t("report.columns")}
                empty={t("report.dropHere")}
                pills={spec.columns.map((key) => ({
                  key,
                  label: t(fieldOf(spec.subject, key)!.label as never),
                }))}
                takes={(key) => !spec.columns.includes(key)}
                onDrop={(key) => set({ columns: [...spec.columns, key] })}
                onRemove={(key) => set({ columns: spec.columns.filter((one) => one !== key) })}
              />
            )}
          </div>

      {/* The output, with the rest of the canvas. */}
      <section className="flex min-h-[420px] flex-col gap-3 rounded-[14px] border border-line bg-surface p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="font-display text-[22px] leading-7 text-fg">
            {counted && groupField && measureName
              ? `${measureName} ${t("report.by", { field: t(groupField.label as never) })}`
              : t("report.answer")}
          </h3>
          <span className="flex items-center gap-2 text-caption text-fg-subtle tabular-nums">
            {running ? <Spinner className="size-3.5" /> : null}
            {result
              ? result.more
                ? t("report.firstRows", { count: String(result.rows.length) })
                : t("report.rowCount", {
                    count: String(result.rows.length),
                    rows: t(def.rowLabel as never),
                  })
              : null}
          </span>
        </div>

        {answer?.error ? <p className="text-[13px] text-danger-text">{answer.error}</p> : null}

        {result && result.rows.length === 0 && !running ? (
          <p className="text-[13px] text-fg-muted">{t("report.nothingMatches")}</p>
        ) : null}

        {result && result.rows.length > 0 ? (
          <div className={running ? "opacity-60 transition-opacity" : undefined}>
            <Answer spec={spec} result={result} rows={20} />
          </div>
        ) : null}
          </section>
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

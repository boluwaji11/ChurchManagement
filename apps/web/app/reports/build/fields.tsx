"use client";

import * as React from "react";
import { Calendar, Hash, Search, ToggleLeft, Type, X } from "lucide-react";
import { IconButton } from "@hearth/ui";
import { SUBJECTS, type FieldDef, type SubjectKey } from "@hearth/db/rules";
import { t } from "@hearth/i18n";

/** Accents and case set aside, so typing "campus" finds "Campus". */
export const fold = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * R18.12. What a field is for.
 *
 * A measure is something to add up. Everything else is a dimension: something
 * to break the answer down by. It is the split every tool of this kind makes,
 * and it is the one that tells somebody which shelf a field belongs on without
 * anybody explaining it.
 */
export const isMeasure = (field: FieldDef): boolean => Boolean(field.numeric);

const ICONS = {
  text: Type,
  choice: Type,
  date: Calendar,
  number: Hash,
  boolean: ToggleLeft,
} as const;

/** What a field being dragged carries with it. */
export const FIELD_MIME = "application/x-hearth-field";

/**
 * R18.12. The fields a report can be built from, down the left.
 *
 * Dragged onto a shelf rather than chosen in a dropdown, because the question
 * "what can I even ask about" is answered by looking at this list, and a
 * dropdown answers it only once it has been opened.
 *
 * Everything here is still a key from the catalogue. Dragging is a way of
 * choosing one, not a way of writing a new one.
 */
export function FieldsPanel({ subject }: { subject: SubjectKey }) {
  const [query, setQuery] = React.useState("");
  const def = SUBJECTS[subject];
  const needle = fold(query.trim());

  const matching = def.fields.filter((one) => fold(t(one.label as never)).includes(needle));
  const dimensions = matching.filter((one) => !isMeasure(one));
  const measures = matching.filter(isMeasure);

  return (
    <aside className="flex w-full shrink-0 flex-col gap-3 rounded-[14px] border border-line bg-surface p-4 lg:w-[260px]">
      <label className="flex items-center gap-2 border-b border-line pb-1.5">
        <Search className="size-4 shrink-0 text-fg-subtle" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={t("report.findField")}
          placeholder={t("report.findField")}
          className="h-8 w-full bg-transparent text-[length:var(--d-text-body)] text-fg outline-none placeholder:text-fg-subtle"
        />
        {query ? (
          <IconButton
            label={t("date.clear")}
            variant="ghost"
            className="size-6 min-h-0 [&_svg]:size-3.5"
            onClick={() => setQuery("")}
          >
            <X />
          </IconButton>
        ) : null}
      </label>

      <Group title={t("report.dimensions")} fields={dimensions} subject={subject} />
      <Group title={t("report.measures")} fields={measures} subject={subject} />

      {matching.length === 0 ? (
        <p className="text-[13px] text-fg-muted">{t("report.noField")}</p>
      ) : null}
    </aside>
  );
}

function Group({
  title,
  fields,
  subject,
}: {
  title: string;
  fields: readonly FieldDef[];
  subject: SubjectKey;
}) {
  if (fields.length === 0) return null;

  return (
    <section className="flex flex-col gap-1">
      <h4 className="text-caption font-semibold uppercase tracking-wide text-fg-subtle">
        {title}
      </h4>
      <ul className="flex flex-col gap-0.5">
        {fields.map((one) => {
          const Icon = ICONS[one.kind];
          return (
            <li key={one.key}>
              <div
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(FIELD_MIME, one.key);
                  e.dataTransfer.setData("text/plain", one.key);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                title={t(one.label as never)}
                data-subject={subject}
                className="flex cursor-grab items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] text-fg hover:bg-sunken active:cursor-grabbing"
              >
                <Icon
                  className="size-3.5 shrink-0"
                  style={{ color: isMeasure(one) ? "var(--hue-fern-key)" : "var(--hue-sky-key)" }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">{t(one.label as never)}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

"use client";

import * as React from "react";
import {
  Dialog, DialogTrigger, DialogContent, EmptyState,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import type { FormAnswer, FormFieldDef } from "@hearth/db/rules";

export interface SubmissionRow {
  id: string;
  receivedAt: string;
  answers: Record<string, FormAnswer>;
  /** The date already written the way this church reads dates. */
  when: string;
}

/** How one answer reads on a screen, whatever shape it arrived in. */
function spoken(answer: FormAnswer): string {
  if (answer === null || answer === undefined) return "";
  if (Array.isArray(answer)) return answer.join(", ");
  if (typeof answer === "boolean") return answer ? t("value.yes") : t("value.no");
  return String(answer);
}

/**
 * R4.4. What people sent in.
 *
 * A row per response and a column per question, which is the shape a church
 * already reads this in: the spreadsheet they were keeping before. The first
 * few questions fit across, and the whole response opens on the row.
 */
export function Responses({
  fields,
  rows,
}: {
  fields: FormFieldDef[];
  rows: SubmissionRow[];
}) {
  // Headings are the questions that have answers, and only as many as sit
  // across a screen without the table scrolling sideways on a laptop.
  const asked = fields.filter((one) => one.kind !== "section");
  const columns = asked.slice(0, 4);

  if (rows.length === 0) return <EmptyState title={t("form.responses.empty")} />;

  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-line">
            <th className="w-[180px] px-4 py-3 text-[12px] font-medium text-fg-subtle">
              {t("form.responses.when")}
            </th>
            {columns.map((field) => (
              <th
                key={field.id}
                className="px-4 py-3 text-[12px] font-medium text-fg-subtle"
              >
                {field.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-line last:border-0 hover:bg-sunken">
              <td className="px-4 py-3 align-top">
                <Dialog>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="cursor-pointer whitespace-nowrap text-left text-label font-medium text-primary tabular-nums"
                    >
                      {row.when}
                    </button>
                  </DialogTrigger>
                  <DialogContent
                    title={t("form.responses.title", { date: row.when })}
                    closeLabel={t("common.close")}
                  >
                    <dl className="flex flex-col gap-3">
                      {asked.map((field) => {
                        const said = spoken(row.answers[field.id] ?? null);
                        return (
                          <div key={field.id} className="flex flex-col gap-0.5">
                            <dt className="text-[12px] font-medium text-fg-subtle">
                              {field.label}
                            </dt>
                            <dd
                              className={
                                said
                                  ? "text-[length:var(--d-text-body)] text-fg"
                                  : "text-[length:var(--d-text-body)] text-fg-subtle"
                              }
                            >
                              {said || t("form.responses.blank")}
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                  </DialogContent>
                </Dialog>
              </td>

              {columns.map((field) => {
                const said = spoken(row.answers[field.id] ?? null);
                return (
                  <td
                    key={field.id}
                    className="max-w-[260px] truncate px-4 py-3 align-top text-[length:var(--d-text-body)] text-fg"
                  >
                    {said || <span className="text-fg-subtle">{"—"}</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

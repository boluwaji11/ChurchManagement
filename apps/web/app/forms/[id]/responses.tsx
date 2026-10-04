"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Dialog, DialogTrigger, DialogContent, EmptyState } from "@hearth/ui";
import { t } from "@hearth/i18n";
import type { FormAnswer, FormFieldDef } from "@hearth/db/rules";
import { Pages } from "@/components/pages";

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
 * few questions fit across, the whole response opens on the row, and the pages
 * underneath are the ones the directory uses.
 */
export function Responses({
  fields,
  rows,
  page,
  perPage,
  total,
}: {
  fields: FormFieldDef[];
  rows: SubmissionRow[];
  page: number;
  perPage: number;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // Headings are the questions that have answers, and only as many as sit
  // across a screen without the table scrolling sideways on a laptop.
  const asked = fields.filter((one) => one.kind !== "section");
  const columns = asked.slice(0, 4);

  const go = (next: number) => {
    const query = new URLSearchParams(params.toString());
    if (next <= 1) query.delete("page");
    else query.set("page", String(next));
    router.push(`${pathname}?${query.toString()}`, { scroll: false });
  };

  if (total === 0) return <EmptyState title={t("form.responses.empty")} />;

  const first = (page - 1) * perPage + 1;
  const upto = Math.min(page * perPage, total);

  return (
    <div className="flex flex-col gap-4">
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
              <Dialog key={row.id}>
                <DialogTrigger asChild>
                  {/* The whole row opens the response. It stands for one
                      thing, so pressing anywhere on it means the same. */}
                  <tr
                    tabIndex={0}
                    aria-label={t("form.responses.open")}
                    className="cursor-pointer border-b border-line last:border-0 hover:bg-sunken focus-visible:bg-sunken focus-visible:outline-none"
                  >
                    <td className="px-4 py-3 align-top text-label font-medium whitespace-nowrap text-fg tabular-nums">
                      {row.when}
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
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[13px] text-fg-muted">
          {t("form.responses.showing", {
            range: t("pages.range", { first, upto, matching: total }),
          })}
        </span>
        <Pages page={page} last={Math.max(1, Math.ceil(total / perPage))} onPage={go} />
      </div>
    </div>
  );
}

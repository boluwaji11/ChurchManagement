"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { UserCheck } from "lucide-react";
import { Button, Dialog, DialogTrigger, DialogContent } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { Empty } from "@/components/empty";
import type { FormAnswer, FormFieldDef } from "@hearth/db/rules";
import { Pages } from "@/components/pages";
import { matchResponses } from "../actions";

export interface SubmissionRow {
  id: string;
  receivedAt: string;
  answers: Record<string, FormAnswer>;
  /** The date already written the way this church reads dates. */
  when: string;
  /** R4.4. Who this turned out to be, where anybody is sure. */
  personId: string | null;
  personName: string | null;
  matchState: string;
}

/**
 * R4.4. The four things that can have become of a submission.
 *
 * The hue carries the reading: a new record and a matched one are both settled,
 * one row needs somebody to look, and a form that asked nothing a person can be
 * found by was never going to land anywhere.
 */
const MATCH_HUE: Record<string, string> = {
  created: "fern",
  matched: "sky",
  review: "amber",
  none: "clay",
};

function MatchTag({ state }: { state: string }) {
  const hue = MATCH_HUE[state] ?? "clay";
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-medium"
      style={{ background: `var(--hue-${hue}-tint)`, color: `var(--hue-${hue}-key)` }}
    >
      {t(`form.match.${state}` as never)}
    </span>
  );
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
  church,
  formId,
  fields,
  rows,
  page,
  perPage,
  total,
}: {
  church: string;
  formId: string;
  fields: FormFieldDef[];
  rows: SubmissionRow[];
  page: number;
  perPage: number;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [matching, startMatching] = React.useTransition();

  // R4.4. How many on this page landed nowhere. A church that has just pointed
  // its questions at the record can run those through without waiting for the
  // next person to fill the form in.
  const unplaced = rows.filter((one) => !one.personId && one.matchState !== "review").length;

  // Headings are the questions that have answers, and only as many as sit
  // across a screen without the table scrolling sideways on a laptop.
  const asked = fields.filter((one) => one.kind !== "section");
  const columns = asked.slice(0, 3);

  const go = (next: number) => {
    const query = new URLSearchParams(params.toString());
    if (next <= 1) query.delete("page");
    else query.set("page", String(next));
    router.push(`${pathname}?${query.toString()}`, { scroll: false });
  };

  if (total === 0) return <Empty icon="inbox" title={t("form.responses.empty")} />;

  const first = (page - 1) * perPage + 1;
  const upto = Math.min(page * perPage, total);

  return (
    <div className="flex flex-col gap-4">
      {unplaced > 0 ? (
        <Button
          type="button"
          variant="secondary"
          disabled={matching}
          className="self-start"
          onClick={() =>
            startMatching(async () => {
              await matchResponses(formId, church);
              router.refresh();
            })}
        >
          <UserCheck className="size-4" aria-hidden />
          {t("form.match.run")}
        </Button>
      ) : null}

      <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-line">
              <th className="w-[180px] px-4 py-3 text-[12px] font-semibold text-fg">
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
              <th className="w-[200px] px-4 py-3 text-[12px] font-medium text-fg-subtle">
                {t("form.match.heading")}
              </th>
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
                          {said || (
                            <span
                              aria-hidden
                              className="inline-block h-px w-3 bg-line-strong align-middle"
                            />
                          )}
                        </td>
                      );
                    })}

                    {/* The name reads as text here rather than a link, because
                        the row already opens the response and a link inside it
                        would be swallowed by the press. The link is in the
                        response itself. */}
                    <td className="px-4 py-3 align-top">
                      {row.personName ? (
                        <span className="text-[length:var(--d-text-body)] text-fg">
                          {row.personName}
                        </span>
                      ) : (
                        <MatchTag state={row.matchState} />
                      )}
                    </td>
                  </tr>
                </DialogTrigger>

                <DialogContent
                  title={t("form.responses.title", { date: row.when })}
                  closeLabel={t("common.close")}
                >
                  {/* R4.4. Where this landed on the directory, at the top,
                      because it is the question a church opens a response to
                      answer. */}
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <MatchTag state={row.matchState} />
                    {row.personId && row.personName ? (
                      <Link
                        href={`/people/${row.personId}?church=${church}`}
                        className="text-[length:var(--d-text-body)] font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {row.personName}
                      </Link>
                    ) : null}
                  </div>

                  <dl className="flex flex-col gap-3">
                    {asked.map((field) => {
                      const said = spoken(row.answers[field.id] ?? null);
                      return (
                        <div key={field.id} className="flex flex-col gap-0.5">
                          <dt className="text-[12px] font-semibold text-fg">
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

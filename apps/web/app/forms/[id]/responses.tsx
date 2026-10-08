"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { UserCheck, Paperclip } from "lucide-react";
import { Button, Dialog, DialogTrigger, DialogContent } from "@connectapp/ui";
import { t, plural } from "@connectapp/i18n";
import { Empty } from "@/components/empty";
import type { FormAnswer, FormFieldDef } from "@connectapp/db/rules";
import { Pages } from "@/components/pages";
import { matchResponses } from "../actions";
import { ResizableTable } from "@/components/resizable-columns";

export interface SubmissionRow {
  id: string;
  receivedAt: string;
  answers: Record<string, FormAnswer>;
  /** The date already written the way this church reads dates. */
  when: string;
  /** R4.4. Who this turned out to be, where anybody is sure. */
  memberId: string | null;
  personSlug: string | null;
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

/** R4.1. The files on one answer, as links that sign themselves when pressed. */
function Files({ answer, church }: { answer: FormAnswer; church: string }) {
  const keys = Array.isArray(answer) ? answer : [];
  if (keys.length === 0) return null;

  return (
    <span className="flex flex-col gap-1">
      {keys.map((key, at) => (
        <a
          key={key}
          href={`/api/forms/file?church=${church}&key=${encodeURIComponent(key)}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
        >
          <Paperclip className="size-3.5 shrink-0" aria-hidden />
          {t("form.files.nth", { number: at + 1 })}
        </a>
      ))}
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
 * R4.4. What members sent in.
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
  const [done, setDone] = React.useState<number | null>(null);

  /*
   * R4.4. Whether there is a catch-up to run.
   *
   * A response is matched the moment it arrives, so this is only ever for the
   * answers collected before the questions were pointed at the record. It needs
   * both halves: rows that landed nowhere, and at least one question that now
   * says where an answer goes. Without the second half the button would be
   * offering work that cannot do anything.
   */
  const mapped = fields.some((one) => one.mapsTo);
  const unplaced = rows.filter((one) => !one.memberId && one.matchState !== "review").length;
  const canCatchUp = mapped && unplaced > 0;

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

  if (total === 0) return <Empty icon="inbox" title={t("form.responses.empty")}
          body={t("form.responses.empty.body")} />;

  const first = (page - 1) * perPage + 1;
  const upto = Math.min(page * perPage, total);
  // R24.6. Named, so turning a page brings the reader back to its head.
  const anchor = React.useId();

  return (
    <div id={anchor} className="flex scroll-mt-20 flex-col gap-4">
      {canCatchUp ? (
        <Button
          type="button"
          variant="secondary"
          disabled={matching}
          className="self-start"
          onClick={() =>
            startMatching(async () => {
              const result = await matchResponses(formId, church);
              setDone(result.placed ?? 0);
              router.refresh();
            })}
        >
          <UserCheck className="size-4" aria-hidden />
          {t("form.match.run")}
        </Button>
      ) : null}

      {done !== null ? (
        <span className="text-[13px] text-fg-muted">
          {plural("form.match.placed", done)}
        </span>
      ) : null}

      {/* R24.6. A response is a record somebody opens, so on a phone it is a
          card rather than a row five columns wide. */}
      <ul className="flex flex-col gap-2 sm:hidden">
        {rows.map((row) => (
          <li key={row.id}>
            <Response row={row} asked={asked} church={church}>
              <button
                type="button"
                aria-label={t("form.responses.open")}
                className="flex w-full cursor-pointer flex-col gap-2 rounded-lg border border-line bg-surface p-4 text-left hover:bg-sunken"
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-label font-medium text-fg tabular-nums">{row.when}</span>
                  {row.personName ? (
                    <span className="text-[length:var(--d-text-body)] text-fg">
                      {row.personName}
                    </span>
                  ) : null}
                  {!row.personName || row.matchState === "review" ? (
                    <MatchTag state={row.matchState} />
                  ) : null}
                </span>

                {columns.map((field) => {
                  const answer = row.answers[field.id] ?? null;
                  const said = field.kind === "file"
                    ? plural("form.files.count", Array.isArray(answer) ? answer.length : 0)
                    : spoken(answer);
                  if (!said) return null;
                  return (
                    <span key={field.id} className="flex min-w-0 flex-col">
                      <span className="text-[12px] font-medium text-fg-subtle">{field.label}</span>
                      <span className="truncate text-[length:var(--d-text-body)] text-fg">
                        {said}
                      </span>
                    </span>
                  );
                })}
              </button>
            </Response>
          </li>
        ))}
      </ul>

      <ResizableTable
        id="form-responses"
        className="hidden rounded-[14px] border border-line bg-surface sm:block"
      >
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
              <Response key={row.id} row={row} asked={asked} church={church}>
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
                    const answer = row.answers[field.id] ?? null;
                    const said = field.kind === "file"
                      ? plural("form.files.count", Array.isArray(answer) ? answer.length : 0)
                      : spoken(answer);
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
                    <span className="flex flex-wrap items-center gap-2">
                      {row.personName ? (
                        <span className="text-[length:var(--d-text-body)] text-fg">
                          {row.personName}
                        </span>
                      ) : null}
                      {/* R4.5. Flagged where somebody is already reading,
                          rather than held in a queue of its own. */}
                      {!row.personName || row.matchState === "review" ? (
                        <MatchTag state={row.matchState} />
                      ) : null}
                    </span>
                  </td>
                </tr>
              </Response>
            ))}
          </tbody>
        </table>
      </ResizableTable>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[13px] text-fg-muted">
          {t("form.responses.showing", {
            range: t("pages.range", { shown: upto - first + 1, matching: total }),
          })}
        </span>
        <Pages
          page={page}
          last={Math.max(1, Math.ceil(total / perPage))}
          onPage={go}
          anchor={anchor}
        />
      </div>
    </div>
  );
}


/**
 * One response, and the panel it opens.
 *
 * The same panel behind a row on a laptop and behind a card on a phone, so
 * what a church reads when it opens a response does not depend on the screen.
 */
function Response({
  row,
  asked,
  church,
  children,
}: {
  row: SubmissionRow;
  asked: FormFieldDef[];
  church: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        title={t("form.responses.title", { date: row.when })}
        closeLabel={t("common.close")}
      >
        {/* R4.4. Where this landed on the directory, at the top,
            because it is the question a church opens a response to
            answer. */}
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <MatchTag state={row.matchState} />
          {row.matchState === "review" ? (
            <Link
              href={`/duplicates?church=${church}`}
              className="text-[length:var(--d-text-body)] font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("form.match.compare")}
            </Link>
          ) : null}
          {row.memberId && row.personName ? (
            <Link
              href={`/members/${row.personSlug}?church=${church}`}
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
                  {field.kind === "file" ? (
                    <Files answer={row.answers[field.id] ?? null} church={church} />
                  ) : (
                    said || t("form.responses.blank")
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@hearth/ui";
import { t } from "@hearth/i18n";
import type { OpenFollowUp } from "@hearth/db";
import { finishStep } from "@/app/people/followup-actions";
import { shortDate } from "@/lib/dates";
import { Panel } from "./panel";

/**
 * R5.5, R18.1. The few follow-ups that are open, answerable from here.
 *
 * Marking one done is the whole point of the panel: a church that has to open
 * the board to tick off a phone call it made this morning will not tick it off.
 * The board is still where the work is sorted, and the heading links there.
 */
export function FollowUp({
  church,
  today,
  entries,
}: {
  church: string;
  today: string;
  entries: OpenFollowUp[];
}) {
  const router = useRouter();
  const [done, setDone] = React.useState<string[]>([]);
  const [working, setWorking] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();

  const open = entries.filter((one) => !done.includes(one.id));

  return (
    <Panel
      title={t("dashboard.followUp")}
      link={{ label: t("dashboard.board"), href: `/followups?church=${church}` }}
    >
      {error ? (
        <p role="status" className="mb-2 text-[13px] text-danger-text">{error}</p>
      ) : null}

      {open.length === 0 ? (
        <p className="text-[length:var(--d-text-body)] text-fg-muted">
          {t("dashboard.followUpEmpty")}
        </p>
      ) : (
        <ol className="flex flex-col">
          {open.map((one) => (
            <li
              key={one.id}
              className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0"
            >
              <span className="flex min-w-0 flex-1 flex-col leading-[18px]">
                <Link
                  href={`/people/${one.personSlug}?church=${church}`}
                  className="truncate font-medium text-fg hover:text-primary"
                >
                  {one.personName}
                </Link>
                <span className="truncate text-[12px] text-fg-subtle">
                  {[
                    one.title,
                    one.dueOn
                      ? one.dueOn < today
                        ? t("dashboard.overdueOn", { date: shortDate(one.dueOn) })
                        : shortDate(one.dueOn)
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>

              {one.owner ? (
                <span className="shrink-0 text-[12px] text-fg-muted">{one.owner}</span>
              ) : null}

              <Button
                variant="secondary"
                className="min-h-[30px] shrink-0 px-2.5 text-[13px]"
                loading={working === one.id}
                onClick={() => {
                  setWorking(one.id);
                  setError(null);
                  startTransition(async () => {
                    const result = await finishStep(one.id, null, church);
                    setWorking(null);
                    if (result.error) {
                      setError(result.error);
                      return;
                    }
                    setDone((was) => [...was, one.id]);
                    router.refresh();
                  });
                }}
              >
                {t("action.done")}
              </Button>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

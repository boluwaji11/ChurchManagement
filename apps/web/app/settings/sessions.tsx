"use client";

import * as React from "react";
import { LogOut, Monitor } from "lucide-react";
import { Badge, Banner, Button } from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import { endSession, endOtherSessions } from "./session-actions";

export interface SessionRow {
  id: string;
  browser: string;
  platform: string;
  ip: string | null;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
}

/**
 * R1.10. Every device holding a live sign-in, and a way to end one.
 *
 * This device is marked and cannot be ended here, because signing yourself out
 * of the page you are reading is what the header button is for, and a list where
 * one press logs you out by accident is a list nobody uses.
 */
export function Sessions({ church, rows }: { church: string; rows: SessionRow[] }) {
  const [error, setError] = React.useState<string>();
  const [ended, setEnded] = React.useState(0);
  const [pending, startTransition] = React.useTransition();

  const others = rows.filter((r) => !r.current).length;
  const reportEnded = ended > 0 && !error;

  const act = (fn: (d: FormData) => Promise<{ error?: string; ended?: number }>, id?: string) => {
    const data = new FormData();
    data.set("church", church);
    if (id) data.set("id", id);
    startTransition(async () => {
      const result = await fn(data);
      setError(result.error);
      setEnded(result.ended ?? 0);
    });
  };

  return (
    <div className="flex flex-col gap-3" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("session.title")}>{error}</Banner> : null}
      {reportEnded ? <Banner tone="success" title={plural("session.ended", ended)} /> : null}

      <section className="rounded-[14px] border border-line bg-surface px-5 py-1">
        {rows.map((row) => (
          <div
            key={row.id}
            className="flex flex-wrap items-center gap-3 border-b border-sunken py-3 last:border-0"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-sunken text-fg-muted">
              <Monitor className="size-[18px]" aria-hidden />
            </span>

            <span className="flex min-w-0 flex-[1_1_200px] flex-col leading-[18px]">
              <span className="truncate font-medium text-fg">
                {row.browser === "unknown" && row.platform === "unknown"
                  ? t("session.unknownDevice")
                  : t("session.device", { browser: row.browser, platform: row.platform })}
              </span>
              <span className="truncate text-[12px] text-fg-subtle">
                {t("session.lastSeen", { date: row.lastSeenAt })}
                {row.ip ? ` \u00b7 ${row.ip}` : ""}
              </span>
            </span>

            {row.current ? (
              <Badge tone="primary">{t("session.thisDevice")}</Badge>
            ) : (
              <Button
                variant="secondary"
                className="min-h-[34px] px-3 text-[13px]"
                disabled={pending}
                onClick={() => act(endSession, row.id)}
              >
                {t("session.end")}
              </Button>
            )}
          </div>
        ))}
      </section>

      {others > 0 ? (
        <div className="flex justify-end">
          <Button variant="ghost" onClick={() => act(endOtherSessions)} disabled={pending}>
            <LogOut /> {t("session.endOthers")}
          </Button>
        </div>
      ) : (
        <p className="text-fg-muted">{t("session.none")}</p>
      )}
    </div>
  );
}

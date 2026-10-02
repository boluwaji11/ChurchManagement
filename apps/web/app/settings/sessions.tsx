"use client";

import * as React from "react";
import { LogOut, Monitor } from "lucide-react";
import { Badge, Banner, Button, IconButton } from "@hearth/ui";
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

      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-canvas p-2.5"
          >
            <Monitor className="size-4 shrink-0 text-fg-muted" aria-hidden />
            <span className="text-[length:var(--d-text-body)] text-fg">
              {row.browser === "unknown" && row.platform === "unknown"
                ? t("session.unknownDevice")
                : t("session.device", { browser: row.browser, platform: row.platform })}
            </span>
            {row.current ? <Badge tone="primary">{t("session.thisDevice")}</Badge> : null}
            <span className="text-caption text-fg-muted">
              {t("session.lastSeen", { date: row.lastSeenAt })}
              {row.ip ? ` · ${row.ip}` : ""}
            </span>
            {row.current ? null : (
              <IconButton
                label={t("session.end")}
                variant="ghost"
                className="ml-auto"
                onClick={() => act(endSession, row.id)}
              >
                <LogOut />
              </IconButton>
            )}
          </li>
        ))}
      </ul>

      {others > 0 ? (
        <div>
          <Button variant="secondary" onClick={() => act(endOtherSessions)} disabled={pending}>
            <LogOut /> {t("session.endOthers")}
          </Button>
        </div>
      ) : (
        <p className="text-[length:var(--d-text-body)] text-fg-muted">{t("session.none")}</p>
      )}
    </div>
  );
}

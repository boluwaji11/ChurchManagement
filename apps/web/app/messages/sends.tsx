"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Send, Square } from "lucide-react";
import {
  Badge, Banner, Button, Card, CardTitle, EmptyState, Field, Input, Progress, Separator,
  Dialog, DialogTrigger, DialogContent, DialogFooter,
} from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import type { Send as SendRow } from "@hearth/db";
import { queue, nudge, stopSend } from "./actions";
import type { AudienceChoice } from "@hearth/db/rules";

/**
 * R16.6. Sending it, and watching it go.
 *
 * The first batch runs while somebody is looking at the screen, so pressing
 * send does something visible. The rest is carried by the queue script, which
 * is what makes a send survive the laptop being closed.
 */
export function Sends({
  church,
  rows,
  draft,
  canSend,
}: {
  church: string;
  rows: SendRow[];
  /** What the composer and the picker currently hold. */
  draft: { subject: string; body: string; audience: AudienceChoice; audienceName: string };
  canSend: boolean;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [said, setSaid] = React.useState<string>();
  const [when, setWhen] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  const working = rows.some((row) => row.status === "sending");

  // While something is going, carry the next batch and show where it got to.
  React.useEffect(() => {
    if (!working) return;
    const beat = setInterval(() => {
      nudge(church).then(() => router.refresh());
    }, 5000);
    return () => clearInterval(beat);
  }, [working, church, router]);

  const send = (sendAt: string | null) => {
    startTransition(async () => {
      const result = await queue({ ...draft, sendAt }, church);
      setError(result.error);
      setSaid(
        result.error
          ? undefined
          : result.noEmail
            ? t("send.queued", {
                count: String(result.queued ?? 0),
                noEmail: String(result.noEmail),
              })
            : t("send.queuedAll", { count: String(result.queued ?? 0) }),
      );
      if (!result.error) router.refresh();
    });
  };

  return (
    <Card aria-busy={pending}>
      <CardTitle>{t("send.title")}</CardTitle>
      <Separator className="my-4" />

      <div className="flex flex-col gap-4">
        {error ? <Banner tone="danger" title={t("send.failed")}>{error}</Banner> : null}
        {said ? <Banner tone="success" title={said} /> : null}

        <div className="flex flex-wrap items-end gap-3">
          <Button type="button" disabled={pending || !canSend} onClick={() => send(null)}>
            <Send /> {t("send.now")}
          </Button>

          <Field label={t("send.when")} className="w-56">
            <Input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </Field>

          <Button
            type="button"
            variant="secondary"
            disabled={pending || !canSend || !when}
            onClick={() => send(new Date(when).toISOString())}
          >
            {t("send.schedule")}
          </Button>
        </div>

        <Separator />

        {rows.length === 0 ? (
          <EmptyState title={t("send.empty")} />
        ) : (
          <ul className="flex flex-col gap-4">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="min-w-0 flex-1 flex-col">
                    <span className="block truncate text-[length:var(--d-text-body)] text-fg">
                      {row.subject}
                    </span>
                    <span className="block text-caption text-fg-muted">
                      {row.audienceName}
                    </span>
                  </span>

                  <Badge
                    tone={
                      row.status === "sent" ? "success"
                        : row.status === "failed" ? "danger"
                        : "neutral"
                    }
                  >
                    {t(`send.status.${row.status}` as never)}
                  </Badge>

                  {row.status === "scheduled" || row.status === "sending" ? (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button type="button" variant="ghost" disabled={pending}>
                          <Square /> {t("send.cancel")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent
                        title={t("send.cancelTitle")}
                        closeLabel={t("common.close")}
                      >
                        <p className="text-[length:var(--d-text-body)] text-fg">
                          {t("send.cancelBody")}
                        </p>
                        <DialogFooter>
                          <Button
                            type="button"
                            variant="danger"
                            disabled={pending}
                            onClick={() =>
                              startTransition(async () => {
                                const result = await stopSend(row.id, church);
                                setError(result.error);
                                if (!result.error) router.refresh();
                              })}
                          >
                            {t("send.cancel")}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  ) : null}
                </div>

                <Progress
                  value={row.progress.sent + row.progress.failed}
                  max={Math.max(row.progress.total, 1)}
                  tone={row.progress.failed > 0 ? "danger" : "primary"}
                  label={row.subject}
                />

                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="text-caption text-fg-muted tabular-nums">
                    {t("send.progress", {
                      sent: String(row.progress.sent),
                      total: String(row.progress.total),
                    })}
                  </span>
                  {row.progress.failed > 0 ? (
                    <span className="text-caption text-danger-text tabular-nums">
                      {plural("send.failedCount", row.progress.failed)}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

import { Badge, Card, CardTitle, EmptyState, Progress, Separator } from "@hearth/ui";
import { t } from "@hearth/i18n";
import type { Allowance, SendRecord } from "@hearth/db";
import { longDate } from "@/lib/dates";

const PURPOSES = new Set([
  "invitation", "password_reset", "checkin_receipt", "serving_request",
]);

/**
 * R16.3. What the shared allowance is for, and what is left of it.
 *
 * A visible number rather than a quiet throttle. A church that cannot see it
 * will blame the software the week its invitations stop arriving.
 */
export function AllowanceCard({
  allowance,
  sends,
  own,
}: {
  allowance: Allowance;
  sends: SendRecord[];
  /** True when the church has its own account, so the allowance is untouched. */
  own: boolean;
}) {
  const nearly = allowance.remaining <= allowance.allowance / 10;

  return (
    <Card>
      <CardTitle>{t("allowance.title")}</CardTitle>
      <Separator className="my-4" />

      <div className="flex flex-col gap-3">
        <p className="text-[length:var(--d-text-body)] text-fg">
          {own ? t("allowance.own") : t("allowance.covers")}
        </p>

        {own ? null : (
          <>
            <Progress
              value={allowance.used}
              max={allowance.allowance}
              tone={nearly ? "danger" : "primary"}
              label={t("allowance.title")}
            />
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <span className="text-caption text-fg-muted tabular-nums">
                {t("allowance.used", {
                  used: String(allowance.used),
                  allowance: String(allowance.allowance),
                })}
              </span>
              <span className="text-caption text-fg-muted">
                {t("allowance.resets", { day: longDate(allowance.resetsOn) })}
              </span>
            </div>
          </>
        )}

        <Separator />
        <span className="text-label text-fg">{t("allowance.recent")}</span>

        {sends.length === 0 ? (
          <EmptyState title={t("allowance.empty")} />
        ) : (
          <ul className="flex flex-col gap-2">
            {sends.map((send) => (
              <li key={send.id} className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[length:var(--d-text-body)] text-fg">
                  {send.toEmail}
                </span>
                <span className="text-caption text-fg-muted">
                  {PURPOSES.has(send.purpose)
                    ? t(`allowance.purpose.${send.purpose}` as never)
                    : send.purpose}
                </span>
                <Badge tone="neutral">{t(`allowance.via.${send.via}` as never)}</Badge>
                <Badge tone={send.status === "sent" ? "success" : "danger"}>
                  {t(`allowance.status.${send.status}` as never)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

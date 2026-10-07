"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Lock, LockOpen, Trash2 } from "lucide-react";
import {
  Banner, Button, Dialog, DialogContent, DialogFooter, Field, IconButton, Textarea,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { money } from "@/lib/money";
import { GiftPanel } from "../../gift-panel";
import { finishCount, openAgain, dropGift } from "../../actions";

export interface CountLine {
  id: string;
  giver: string | null;
  fund: string;
  method: string;
  reference: string | null;
  amountCents: number;
  inKind: string | null;
}

/**
 * R13.10, R13.11. The count, and the two numbers it turns on.
 *
 * What was declared, what has been entered, and the difference said in words
 * rather than left for somebody to work out. Closing is refused while the two
 * differ and nothing has been written down to say why.
 */
export function CountScreen({
  church,
  count,
  lines,
  funds,
}: {
  church: string;
  count: {
    id: string;
    name: string;
    receivedOn: string;
    expectedCents: number;
    enteredCents: number;
    varianceNote: string | null;
    closed: boolean;
  };
  lines: CountLine[];
  funds: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();
  const [asking, setAsking] = React.useState(false);
  const [why, setWhy] = React.useState("");
  const [removing, setRemoving] = React.useState<string | null>(null);

  const run = (work: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      if (!result.error) router.refresh();
    });

  const difference = count.enteredCents - count.expectedCents;

  return (
    <div className="flex flex-col gap-5" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("giving.failed")}>{error}</Banner> : null}

      <div className="flex flex-wrap items-end justify-between gap-4 rounded-[14px] border border-line bg-surface p-5">
        <div className="flex flex-wrap gap-8">
          <span className="flex flex-col">
            <span className="text-[13px] font-medium text-fg-muted">
              {t("giving.count.expected")}
            </span>
            <span data-numeric className="font-display text-[32px] leading-[38px] text-fg">
              {money(count.expectedCents)}
            </span>
          </span>

          <span className="flex flex-col">
            <span className="text-[13px] font-medium text-fg-muted">
              {t("giving.count.lines")}
            </span>
            <span data-numeric className="font-display text-[32px] leading-[38px] text-fg">
              {money(count.enteredCents)}
            </span>
            <span
              className="mt-1 text-[13px] font-medium"
              style={{
                color: difference === 0 ? "var(--hue-fern-key)" : "var(--hue-amber-key)",
              }}
            >
              {difference === 0
                ? t("giving.count.balanced")
                : difference > 0
                  ? t("giving.count.over", { amount: money(difference) })
                  : t("giving.count.under", { amount: money(-difference) })}
            </span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {count.closed ? (
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => run(() => openAgain(count.id, church))}
            >
              <LockOpen /> {t("giving.count.reopen")}
            </Button>
          ) : (
            <>
              <GiftPanel church={church} today={count.receivedOn} funds={funds} batchId={count.id} />
              <Button disabled={pending} onClick={() => setAsking(true)}>
                <Lock /> {t("giving.count.close")}
              </Button>
            </>
          )}
        </div>
      </div>

      {count.varianceNote ? (
        <Banner tone="info" title={t("giving.count.variance")}>{count.varianceNote}</Banner>
      ) : null}

      {lines.length === 0 ? (
        <p className="text-fg-muted">{t("giving.count.empty")}</p>
      ) : (
        <ul className="overflow-hidden rounded-lg border border-line bg-surface">
          {lines.map((line) => (
            <li
              key={line.id}
              className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-0"
            >
              <span className="min-w-0 flex-1 text-fg">
                {line.giver ?? t("giving.gift.anonymous")}
              </span>
              <span className="w-[140px] shrink-0 truncate text-[13px] text-fg-muted">
                {line.fund}
              </span>
              <span className="w-[110px] shrink-0 text-[13px] text-fg-muted">
                {t(`giving.method.${line.method}` as never)}
                {line.reference ? ` · ${line.reference}` : ""}
              </span>
              <span data-numeric className="w-[110px] shrink-0 text-right font-mono text-fg">
                {line.inKind ? line.inKind : money(line.amountCents)}
              </span>
              {count.closed ? null : (
                <IconButton
                  label={t("giving.gift.remove")}
                  variant="ghost"
                  disabled={pending}
                  onClick={() => setRemoving(line.id)}
                >
                  <Trash2 />
                </IconButton>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* R13.11. Closing asks for the note when the two numbers differ. */}
      <Dialog open={asking} onOpenChange={(on) => (on ? null : setAsking(false))}>
        <DialogContent title={t("giving.count.closedTitle", { name: count.name })} closeLabel={t("common.close")}>
          {difference === 0 ? null : (
            <Field label={t("giving.count.variance")} required>
              <Textarea rows={3} value={why} onChange={(e) => setWhy(e.target.value)} autoFocus />
            </Field>
          )}

          <DialogFooter>
            <Button variant="ghost" data-dismiss onClick={() => setAsking(false)}>
              {t("action.cancel")}
            </Button>
            <Button
              disabled={pending || (difference !== 0 && why.trim().length === 0)}
              onClick={() => {
                setAsking(false);
                run(() => finishCount(count.id, why.trim() || null, church));
              }}
            >
              {t("giving.count.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={removing !== null} onOpenChange={(on) => (on ? null : setRemoving(null))}>
        <DialogContent alert title={t("giving.gift.removeTitle")}>
          <DialogFooter>
            <Button variant="ghost" data-dismiss onClick={() => setRemoving(null)}>
              {t("action.cancel")}
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                const id = removing;
                setRemoving(null);
                if (id) run(() => dropGift(id, count.id, church));
              }}
            >
              {t("giving.gift.remove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

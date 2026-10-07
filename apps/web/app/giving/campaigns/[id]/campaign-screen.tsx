"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, Undo2 } from "lucide-react";
import {
  Banner, Button, Dialog, DialogContent, DialogFooter, Field, IconButton, Input, Textarea,
  Sheet, SheetContent, SheetTrigger,
} from "@connectapp/ui";
import { t, plural } from "@connectapp/i18n";
import type { Campaign, Pledge } from "@connectapp/db";
import { Picker } from "@/components/picker";
import { useFormError } from "@/lib/form-error";
import { usePanelGuard } from "@/components/panel-guard";
import { money, toCents } from "@/lib/money";
import { longDate } from "@/lib/dates";
import { findGiver, type GiverHit } from "../../actions";
import { savePledge, dropPledge, closeCampaign } from "../actions";
import { CampaignPanel } from "../campaign-panel";
import { Progress } from "../progress";

/**
 * R13.16, R13.18. One campaign, and the commitments against it.
 *
 * A commitment is read against what the household has actually given to the
 * campaign's fund, so a couple who pledged once and gave on one card reads as
 * having kept it.
 */
export function CampaignScreen({
  church,
  today,
  campaign,
  pledges,
  funds,
  manage,
}: {
  church: string;
  today: string;
  campaign: Campaign;
  pledges: Pledge[];
  funds: { id: string; name: string }[];
  manage: boolean;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();
  const [asking, setAsking] = React.useState(false);
  const [removing, setRemoving] = React.useState<string | null>(null);

  const run = (work: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      if (!result.error) router.refresh();
    });

  return (
    <div className="flex flex-col gap-5" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("campaigns.failed")}>{error}</Banner> : null}

      <div className="flex flex-col gap-4 rounded-[14px] border border-line bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <span data-numeric className="font-display text-[34px] leading-[40px] text-fg">
              {money(campaign.receivedCents)}
            </span>
            <span className="text-[13px] text-fg-muted">
              {t("campaigns.received", {
                amount: money(campaign.receivedCents),
                target: money(campaign.targetCents),
              })}
              {" · "}
              {plural("campaigns.pledged", campaign.pledges, {
                amount: money(campaign.pledgedCents),
              })}
            </span>
            <span className="text-[12px] text-fg-subtle">
              {[campaign.fundName, longDate(campaign.startsOn),
                campaign.endsOn ? longDate(campaign.endsOn) : null]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>

          {manage ? (
            <div className="flex flex-wrap items-center gap-2">
              {campaign.archived ? (
                <Button
                  variant="secondary"
                  disabled={pending}
                  onClick={() => run(() => closeCampaign(campaign.id, false, church))}
                >
                  <Undo2 /> {t("campaigns.reopen")}
                </Button>
              ) : (
                <>
                  <PledgePanel church={church} campaignId={campaign.id} />
                  <CampaignPanel
                    church={church}
                    today={today}
                    funds={funds}
                    campaign={campaign}
                    onClose={() => setAsking(true)}
                    trigger={
                      <Button variant="secondary">
                        <Pencil /> {t("action.edit")}
                      </Button>
                    }
                  />
                </>
              )}
            </div>
          ) : null}
        </div>

        <Progress received={campaign.receivedCents} target={campaign.targetCents} />

        {campaign.description ? (
          <p className="m-0 text-[length:var(--d-text-body)] text-fg-muted">
            {campaign.description}
          </p>
        ) : null}
      </div>

      <h2 className="font-display text-[22px] leading-[28px] text-fg">{t("pledge.title")}</h2>

      {pledges.length === 0 ? (
        <p className="text-fg-muted">{t("pledge.none")}</p>
      ) : (
        <ul className="overflow-hidden rounded-lg border border-line bg-surface">
          {pledges.map((one) => {
            const kept = one.givenCents >= one.amountCents;
            return (
              <li
                key={one.id}
                className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-0"
              >
                <span className="min-w-0 flex-1 font-medium text-fg">{one.name}</span>
                <span className="w-[150px] shrink-0 text-[13px] text-fg-muted">
                  {t("pledge.given", { amount: money(one.givenCents) })}
                </span>
                {kept ? (
                  <span
                    className="flex h-[22px] shrink-0 items-center rounded-full px-2 text-[11px] font-semibold"
                    style={{
                      background: "var(--hue-fern-tint)",
                      color: "var(--hue-fern-key)",
                    }}
                  >
                    {t("pledge.kept")}
                  </span>
                ) : null}
                <span data-numeric className="w-[110px] shrink-0 text-right font-mono text-fg">
                  {money(one.amountCents)}
                </span>
                {manage ? (
                  <IconButton
                    label={t("pledge.remove")}
                    variant="ghost"
                    disabled={pending}
                    onClick={() => setRemoving(one.id)}
                  >
                    <Trash2 />
                  </IconButton>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={asking} onOpenChange={(on) => (on ? null : setAsking(false))}>
        <DialogContent alert title={t("campaigns.closeTitle", { name: campaign.name })}>
          <DialogFooter>
            <Button variant="ghost" data-dismiss onClick={() => setAsking(false)}>
              {t("campaigns.keep")}
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                setAsking(false);
                run(() => closeCampaign(campaign.id, true, church));
              }}
            >
              {t("campaigns.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={removing !== null} onOpenChange={(on) => (on ? null : setRemoving(null))}>
        <DialogContent alert title={t("pledge.removeTitle")}>
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
                if (id) run(() => dropPledge(id, campaign.id, church));
              }}
            >
              {t("pledge.remove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** R13.16. One household's commitment, written down. */
function PledgePanel({ church, campaignId }: { church: string; campaignId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [saving, startTransition] = React.useTransition();
  const [error, setError] = useFormError(open);

  const [memberId, setMemberId] = React.useState("");
  const [hits, setHits] = React.useState<GiverHit[]>([]);
  const [amount, setAmount] = React.useState("");
  const [note, setNote] = React.useState("");

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setDirty(false);
      setMemberId("");
      setAmount("");
      setNote("");
    }
  };
  const { onOpenChange, guard } = usePanelGuard({ dirty, setOpen: close });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button><Plus /> {t("pledge.add")}</Button>
      </SheetTrigger>

      <SheetContent
        title={t("pledge.add")}
        closeLabel={t("common.close")}
        footer={
          <Button
            type="button"
            disabled={saving || !dirty || !memberId}
            loading={saving}
            onClick={() => {
              const cents = toCents(amount);
              if (cents === null || cents <= 0) {
                setError(t("campaign.error.target"));
                return;
              }
              startTransition(async () => {
                const result = await savePledge(
                  { campaignId, memberId, amountCents: cents, note: note || null },
                  church,
                );
                setError(result.error);
                if (!result.error) {
                  setDirty(false);
                  setOpen(false);
                  router.refresh();
                }
              });
            }}
          >
            {t("action.save")}
          </Button>
        }
      >
        {guard}

        <div className="flex flex-col gap-4">
          {error ? <Banner tone="danger" title={t("campaigns.failed")}>{error}</Banner> : null}

          <Field label={t("pledge.who")} required>
            <Picker
              name="memberId"
              defaultValue={null}
              options={hits.map((one) => ({ value: one.id, label: one.name }))}
              label={t("pledge.who")}
              onChange={(id) => {
                setMemberId(id);
                setDirty(true);
              }}
              onQuery={(query) => {
                if (query.trim().length < 2) {
                  setHits([]);
                  return;
                }
                void findGiver(query, church).then(setHits);
              }}
            />
          </Field>

          <Field label={t("pledge.amount")} required>
            <Input
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setDirty(true);
              }}
              inputMode="decimal"
              placeholder="0.00"
              autoComplete="off"
            />
          </Field>

          <Field label={t("pledge.note")}>
            <Textarea
              rows={2}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setDirty(true);
              }}
            />
          </Field>
        </div>
      </SheetContent>
    </Sheet>
  );
}

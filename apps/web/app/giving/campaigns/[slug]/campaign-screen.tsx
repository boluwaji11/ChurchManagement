"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CalendarRange, CheckCircle2, HandCoins, Pencil, Plus, Target, Trash2, Undo2, Users, Wallet,
} from "lucide-react";
import {
  Banner, Button, Dialog, DialogContent, DialogFooter, Field, IconButton, Textarea,
  Sheet, SheetContent, SheetTrigger,
} from "@connectapp/ui";
import { t, plural } from "@connectapp/i18n";
import type { Campaign, Pledge } from "@connectapp/db";
import { MoneyInput } from "@/components/money-input";
import { Picker } from "@/components/picker";
import { useFormError } from "@/lib/form-error";
import { usePanelGuard } from "@/components/panel-guard";
import { money, toCents } from "@/lib/money";
import { longDate } from "@/lib/dates";
import { findGiver, type GiverHit } from "../../actions";
import { savePledge, dropPledge, closeCampaign } from "../actions";
import { CampaignPanel } from "../campaign-panel";
import { Progress, PaceChip, percentOf, standingOf } from "../progress";

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

  const standing = standingOf({ ...campaign, today });

  const run = (work: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      if (!result.error) router.refresh();
    });

  return (
    <div className="flex flex-col gap-5" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("campaigns.failed")}>{error}</Banner> : null}

      {/* R13.16. The one number somebody opened this page for, what it is
          measured against, and how that is going. */}
      <section className="flex flex-col rounded-[14px] border border-line bg-surface shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 p-5 pb-4">
          <div className="flex min-w-0 items-start gap-3.5">
            <span
              className="grid size-11 shrink-0 place-items-center rounded-xl [&_svg]:size-5"
              style={{ background: standing.tone.tint, color: standing.tone.text }}
            >
              <Target aria-hidden />
            </span>

            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <span data-numeric className="font-display text-[34px] leading-[38px] text-fg">
                  {money(campaign.receivedCents)}
                </span>
                <span
                  data-numeric
                  className="text-[15px] font-bold"
                  style={{ color: standing.tone.text }}
                >
                  {percentOf(standing)}
                </span>
                <PaceChip standing={standing} />
              </div>

              <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-fg-subtle">
                <span className="flex items-center gap-1.5">
                  <Wallet className="size-3.5 shrink-0" aria-hidden />
                  {campaign.fundName}
                </span>
                <span className="flex items-center gap-1.5">
                  <CalendarRange className="size-3.5 shrink-0" aria-hidden />
                  {campaign.endsOn
                    ? t("campaigns.period", {
                        from: longDate(campaign.startsOn), to: longDate(campaign.endsOn),
                      })
                    : t("campaigns.openEnded", { from: longDate(campaign.startsOn) })}
                </span>
              </span>
            </div>
          </div>

          {manage ? (
            campaign.archived ? (
              <Button
                variant="secondary"
                loading={pending}
                onClick={() => run(() => closeCampaign(campaign.id, false, church))}
              >
                <Undo2 /> {t("campaigns.reopen")}
              </Button>
            ) : (
              <CampaignPanel
                church={church}
                today={today}
                funds={funds}
                campaign={campaign}
                onClose={() => setAsking(true)}
                trigger={
                  <IconButton label={t("action.edit")} variant="secondary">
                    <Pencil />
                  </IconButton>
                }
              />
            )
          ) : null}
        </div>

        <div className="px-5 pb-4">
          <Progress standing={standing} height={10} />
        </div>

        {campaign.description ? (
          <>
            <hr className="border-0 border-t border-line" />
            <p className="m-0 px-5 py-4 text-[length:var(--d-text-body)] text-fg-muted">
              {campaign.description}
            </p>
          </>
        ) : null}

        <hr className="border-0 border-t border-line" />

        {/* The four figures a treasurer reads together, so they are one row
            rather than a sentence somebody has to take apart. */}
        <dl className="m-0 grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
          <Figure
            icon={<HandCoins />}
            label={t("campaigns.raised")}
            value={money(campaign.receivedCents)}
          />
          <Figure
            icon={<Target />}
            label={t("campaigns.target")}
            value={money(campaign.targetCents)}
          />
          <Figure
            icon={<CheckCircle2 />}
            label={t("campaigns.remaining")}
            value={money(Math.max(0, campaign.targetCents - campaign.receivedCents))}
          />
          <Figure
            icon={<Users />}
            label={t("campaigns.pledgedTotal")}
            value={money(campaign.pledgedCents)}
            note={plural("pledge.count", campaign.pledges)}
          />
        </dl>
      </section>

      {/* R13.16. The pledges, with the one action that writes one. It sits
          here rather than beside the campaign's own: adding a pledge is
          something done to this list. */}
      <section className="flex flex-col rounded-[14px] border border-line bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-primary-soft text-primary [&_svg]:size-[18px]">
              <Users aria-hidden />
            </span>
            <span className="flex min-w-0 flex-col leading-5">
              <span className="text-[15px] font-bold text-fg">{t("pledge.title")}</span>
              <span className="truncate text-[13px] text-fg-muted">
                {plural("pledge.count", pledges.length)}
              </span>
            </span>
          </div>

          {manage && !campaign.archived ? (
            <PledgePanel church={church} campaignId={campaign.id} />
          ) : null}
        </div>

        <hr className="border-0 border-t border-line" />

        {pledges.length === 0 ? (
          <p className="m-0 px-5 py-8 text-center text-fg-muted">{t("pledge.none")}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {pledges.map((one) => {
              const kept = one.givenCents >= one.amountCents;
              const short = Math.max(0, one.amountCents - one.givenCents);
              return (
                <li
                  key={one.id}
                  className="flex flex-wrap items-center gap-3 border-t border-sunken px-5 py-3 first:border-0"
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span className="truncate font-medium text-fg">{one.name}</span>
                    {kept ? (
                      <span
                        className="inline-flex h-[22px] shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-semibold"
                        style={{
                          background: "var(--success-soft)", color: "var(--success-text)",
                        }}
                      >
                        <CheckCircle2 className="size-3" aria-hidden />
                        {t("pledge.kept")}
                      </span>
                    ) : null}
                  </span>

                  <span className="flex shrink-0 flex-col items-end leading-5">
                    <span data-numeric className="font-semibold text-fg">
                      {money(one.amountCents)}
                    </span>
                    <span data-numeric className="text-[12px] text-fg-subtle">
                      {kept
                        ? t("pledge.given", { amount: money(one.givenCents) })
                        : t("pledge.toGo", { amount: money(short) })}
                    </span>
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
      </section>

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

/** One figure under the campaign, with the mark that says which it is. */
function Figure({ icon, label, value, note }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="flex flex-col gap-1 border-t border-line px-5 py-3.5 sm:border-t-0">
      <dt className="flex items-center gap-1.5 text-[12px] font-medium text-fg-muted [&_svg]:size-3.5">
        {icon}
        {label}
      </dt>
      <dd data-numeric className="m-0 text-[17px] font-semibold text-fg">{value}</dd>
      {note ? <dd className="m-0 text-[12px] text-fg-subtle">{note}</dd> : null}
    </div>
  );
}

/** R13.16. One household's pledge, written down. */
function PledgePanel({ church, campaignId }: { church: string; campaignId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [saving, startTransition] = React.useTransition();
  const [error, setError] = useFormError(open);

  const [memberId, setMemberId] = React.useState("");
  const [hits, setHits] = React.useState<GiverHit[]>([]);
  const [searching, setSearching] = React.useState(false);
  // An answer that arrives after a newer one was asked for is dropped.
  const ticket = React.useRef(0);
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
        <Button variant="secondary"><Plus /> {t("pledge.add")}</Button>
      </SheetTrigger>

      <SheetContent
        title={t("pledge.add")}
        closeLabel={t("common.close")}
        footer={
          <Button
            type="button"
            disabled={saving || !dirty || !memberId || !amount.trim()}
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
                  close(false);
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
              searching={searching}
              onQuery={(query) => {
                if (query.trim().length < 2) {
                  ticket.current++;
                  setSearching(false);
                  setHits([]);
                  return;
                }
                const mine = ++ticket.current;
                setSearching(true);
                void findGiver(query, church).then((found) => {
                  if (mine !== ticket.current) return;
                  setSearching(false);
                  setHits(found);
                });
              }}
            />
          </Field>

          <Field label={t("pledge.amount")} required>
            <MoneyInput
              value={amount}
              onChange={(next) => {
                setAmount(next);
                setDirty(true);
              }}
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

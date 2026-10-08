"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Archive, Plus } from "lucide-react";
import {
  Banner, Button, Field, IconButton, Input, Textarea,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectCreate,
  Sheet, SheetContent, SheetTrigger,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import type { Campaign } from "@connectapp/db";
import { DateField } from "@/components/date-field";
import { MoneyInput } from "@/components/money-input";
import { usePanelGuard } from "@/components/panel-guard";
import { useFormError } from "@/lib/form-error";
import { groupAmount, toCents } from "@/lib/money";
import { saveCampaign } from "./actions";

/** R13.16. Writing a campaign down, or changing one. */
export function CampaignPanel({
  church,
  today,
  funds,
  campaign,
  trigger,
  onClose,
}: {
  church: string;
  today: string;
  funds: { id: string; name: string }[];
  campaign?: Campaign;
  trigger?: React.ReactNode;
  /** Closing it is asked for in a box of its own, after the panel has gone. */
  onClose?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [saving, startTransition] = React.useTransition();
  const [error, setError] = useFormError(open);

  const [name, setName] = React.useState(campaign?.name ?? "");
  const [description, setDescription] = React.useState(campaign?.description ?? "");
  const [fundId, setFundId] = React.useState(campaign?.fundId ?? funds[0]?.id ?? "");
  const [target, setTarget] = React.useState(
    campaign ? groupAmount((campaign.targetCents / 100).toFixed(2)) : "",
  );
  const [starts, setStarts] = React.useState(campaign?.startsOn ?? today);
  const [ends, setEnds] = React.useState(campaign?.endsOn ?? "");

  React.useEffect(() => {
    if (!open) return;
    setName(campaign?.name ?? "");
    setDescription(campaign?.description ?? "");
    setFundId(campaign?.fundId ?? funds[0]?.id ?? "");
    setTarget(campaign ? groupAmount((campaign.targetCents / 100).toFixed(2)) : "");
    setStarts(campaign?.startsOn ?? today);
    setEnds(campaign?.endsOn ?? "");
  }, [open, campaign, funds, today]);

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) setDirty(false);
  };
  const { onOpenChange, guard } = usePanelGuard({ dirty, setOpen: close });

  const save = () => {
    const cents = toCents(target);
    if (cents === null) {
      setError(t("campaign.error.target"));
      return;
    }
    startTransition(async () => {
      const result = await saveCampaign(
        {
          id: campaign?.id,
          name,
          description: description || null,
          fundId,
          targetCents: cents,
          startsOn: starts,
          endsOn: ends || null,
        },
        church,
      );
      setError(result.error);
      if (!result.error) {
        close(false);
        router.refresh();
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        {trigger ?? <Button><Plus /> {t("campaigns.add")}</Button>}
      </SheetTrigger>

      <SheetContent
        title={
          campaign ? t("campaigns.editTitle", { name: campaign.name }) : t("campaigns.newTitle")
        }
        closeLabel={t("common.close")}
        footer={
          <>
            {campaign && onClose ? (
              <IconButton
                label={t("campaigns.close")}
                variant="ghost"
                className="mr-auto"
                disabled={saving}
                onClick={() => {
                  close(false);
                  onClose();
                }}
              >
                <Archive />
              </IconButton>
            ) : null}
            <Button
              type="button"
              disabled={saving || !dirty || !name.trim() || !fundId || !target.trim() || !starts}
              loading={saving}
              onClick={save}
            >
              {t("action.save")}
            </Button>
          </>
        }
      >
        {guard}

        <div className="flex flex-col gap-4">
          {error ? <Banner tone="danger" title={t("campaigns.failed")}>{error}</Banner> : null}

          <Field label={t("campaigns.name")} required>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setDirty(true);
              }}
              placeholder={t("campaigns.namePlaceholder")}
              autoComplete="off"
              autoFocus
            />
          </Field>

          <Field label={t("campaigns.fund")} required>
            <Select
              value={fundId}
              onValueChange={(id) => {
                setFundId(id);
                setDirty(true);
              }}
            >
              <SelectTrigger aria-label={t("campaigns.fund")}><SelectValue /></SelectTrigger>
              <SelectContent
                create={
                  <SelectCreate href={`/settings/funds?church=${church}`}>
                    {t("fund.add")}
                  </SelectCreate>
                }
              >
                {funds.map((fund) => (
                  <SelectItem key={fund.id} value={fund.id}>{fund.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label={t("campaigns.target")} required>
            <MoneyInput
              value={target}
              onChange={(next) => {
                setTarget(next);
                setDirty(true);
              }}
              placeholder="0.00"
              autoComplete="off"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("campaigns.starts")} required>
              <DateField
                name="startsOn"
                defaultValue={starts}
                onValueChange={(next) => {
                  setStarts(next);
                  setDirty(true);
                }}
              />
            </Field>
            <Field label={t("campaigns.ends")}>
              <DateField
                name="endsOn"
                defaultValue={ends}
                /* A campaign cannot finish before it opens. */
                min={starts || undefined}
                onValueChange={(next) => {
                  setEnds(next);
                  setDirty(true);
                }}
              />
            </Field>
          </div>

          <Field label={t("campaigns.description")}>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setDirty(true);
              }}
            />
          </Field>
        </div>
      </SheetContent>
    </Sheet>
  );
}

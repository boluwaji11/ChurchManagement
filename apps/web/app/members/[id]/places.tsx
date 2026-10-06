"use client";

import * as React from "react";
import { Plus, Star, Trash2 } from "lucide-react";
import {
  Banner, Button, Field, IconButton,
  Sheet, SheetTrigger, SheetContent,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { CONTACT_LABELS, type PersonAddress } from "@connectapp/db/rules";
import { AddressFields } from "@/components/address-fields";
import { emptyAddress, oneLineAddress, toAddress } from "@/lib/address";
import { addPlace, removePlace, leadWithPlace } from "./contact-actions";

/**
 * R2.4. Where somebody is reached, theirs and the household's.
 *
 * A household's address is shown and left alone: it belongs to the family and
 * is changed on the household, so one member's page is not the place to take a
 * family's address away.
 */
export function Places({
  church,
  memberId,
  places,
  canEdit,
}: {
  church: string;
  memberId: string;
  places: PersonAddress[];
  canEdit: boolean;
}) {
  const [adding, setAdding] = React.useState(false);
  const [label, setLabel] = React.useState<string>("home");
  const [error, setError] = React.useState<string>();
  const [pending, run] = React.useTransition();

  const act = (work: () => Promise<{ error?: string }>) =>
    run(async () => setError((await work()).error));

  return (
    <div className="flex flex-col gap-2" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("personForm.failed")}>{error}</Banner> : null}

      {places.map((one) => (
        <span key={one.id} className="group flex items-baseline gap-2">
          <span className="min-w-0 flex-1 text-[length:var(--d-text-body)] text-fg">
            {oneLineAddress(toAddress(one))}
          </span>

          <span className="w-20 shrink-0 text-right text-caption text-fg-subtle">
            {one.fromHousehold
              ? t("contact.fromHousehold")
              : one.isPrimary
                ? t("contact.primary")
                : t(`contactLabel.${one.label}` as never)}
          </span>

          {canEdit && !one.fromHousehold ? (
            <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              {one.isPrimary ? null : (
                <IconButton
                  label={t("contact.makePrimary")}
                  disabled={pending}
                  onClick={() => act(() => leadWithPlace(one.id, memberId, church))}
                  className="size-7 min-h-0 [&_svg]:size-3.5"
                >
                  <Star />
                </IconButton>
              )}
              <IconButton
                label={t("contact.remove", { value: one.line1 })}
                disabled={pending}
                onClick={() => act(() => removePlace(one.id, memberId, church))}
                className="size-7 min-h-0 [&_svg]:size-3.5"
              >
                <Trash2 />
              </IconButton>
            </span>
          ) : null}
        </span>
      ))}

      {places.length === 0 ? (
        <span aria-hidden className="inline-block h-px w-3 bg-line-strong align-middle" />
      ) : null}

      {canEdit ? (
        <Sheet open={adding} onOpenChange={setAdding}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="flex cursor-pointer items-center gap-1.5 self-start text-caption font-medium text-primary"
            >
              <Plus className="size-3.5" aria-hidden />
              {t("contact.addAddress")}
            </button>
          </SheetTrigger>

          <SheetContent
            title={t("contact.addAddress")}
            closeLabel={t("common.close")}
            footer={
              <Button type="submit" form="add-address" disabled={pending}>
                {t("contact.add")}
              </Button>
            }
          >
            <form
              id="add-address"
              action={(data) => {
                act(async () => {
                  const result = await addPlace(
                    {
                      memberId,
                      label,
                      values: {
                        line1: String(data.get("addressLine1") ?? ""),
                        line2: String(data.get("addressLine2") ?? ""),
                        city: String(data.get("addressCity") ?? ""),
                        region: String(data.get("addressRegion") ?? ""),
                        postalCode: String(data.get("addressPostalCode") ?? ""),
                        country: String(data.get("addressCountry") ?? ""),
                      },
                    },
                    church,
                  );
                  if (!result.error) setAdding(false);
                  return result;
                });
              }}
              className="flex flex-col gap-4"
            >
              <Field label={t("contact.label")}>
                <Select value={label} onValueChange={setLabel}>
                  <SelectTrigger className="w-auto min-w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_LABELS.map((one) => (
                      <SelectItem key={one} value={one}>
                        {t(`contactLabel.${one}` as never)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <AddressFields values={emptyAddress()} />

            </form>
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  );
}

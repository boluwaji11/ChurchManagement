"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import {
  Banner, Button, Dialog, DialogContent, DialogFooter, Field, IconButton,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Picker } from "@/components/picker";
import { useFormError } from "@/lib/form-error";
import { findGiver, nameGiver, type GiverHit } from "./actions";

/**
 * R13.18. Saying who a gift was from.
 *
 * An online gift from an address the church has never seen is recorded under
 * the name the giver typed and attached to nobody, so it is on no record and
 * on no year-end statement. This is the one press that puts that right.
 */
export function AttachGift({
  church,
  gift,
}: {
  church: string;
  gift: { id: string; typed: string | null };
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [memberId, setMemberId] = React.useState("");
  const [hits, setHits] = React.useState<GiverHit[]>([]);
  const [searching, setSearching] = React.useState(false);
  // An answer that arrives after a newer one was asked for is dropped.
  const ticket = React.useRef(0);
  const [error, setError] = useFormError(open);
  const [pending, startTransition] = React.useTransition();

  /*
   * Back to a blank dialog. The Picker draws itself empty on the next open
   * whatever this holds, so a chosen person left behind here is a person the
   * next press would attach the next gift to.
   */
  const clear = () => {
    setMemberId("");
    setHits([]);
    setSearching(false);
    ticket.current++;
  };

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) clear();
  };

  return (
    <>
      <IconButton
        label={t("giving.gift.attach")}
        variant="ghost"
        onClick={() => close(true)}
      >
        <UserPlus />
      </IconButton>

      <Dialog open={open} onOpenChange={(on) => (on ? null : close(false))}>
        <DialogContent title={t("giving.gift.attachTitle")} closeLabel={t("common.close")}>
          <div className="flex flex-col gap-4">
            {/* What the giver typed, where they typed anything. */}
            {gift.typed ? (
              <p className="m-0 text-[13px] text-fg-muted">
                {t("giving.gift.attachWas", { who: gift.typed })}
              </p>
            ) : null}
            {error ? <Banner tone="danger" title={t("giving.failed")}>{error}</Banner> : null}

            <Field label={t("giving.gift.giver")} required>
              <Picker
                name="memberId"
                defaultValue={null}
                options={hits.map((one) => ({ value: one.id, label: one.name }))}
                label={t("giving.gift.giver")}
                onChange={setMemberId}
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
          </div>

          <DialogFooter>
            <Button variant="ghost" data-dismiss onClick={() => close(false)}>
              {t("action.cancel")}
            </Button>
            <Button
              disabled={pending || !memberId}
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await nameGiver(gift.id, memberId, church);
                  setError(result.error);
                  if (!result.error) {
                    close(false);
                    router.refresh();
                  }
                })
              }
            >
              {t("action.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

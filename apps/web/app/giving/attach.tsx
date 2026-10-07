"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import {
  Banner, Button, Dialog, DialogContent, DialogFooter, Field, IconButton,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Picker } from "@/components/picker";
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
  gift: { id: string; label: string };
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [memberId, setMemberId] = React.useState("");
  const [hits, setHits] = React.useState<GiverHit[]>([]);
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  return (
    <>
      <IconButton
        label={t("giving.gift.attach")}
        variant="ghost"
        onClick={() => setOpen(true)}
      >
        <UserPlus />
      </IconButton>

      <Dialog open={open} onOpenChange={(on) => (on ? null : setOpen(false))}>
        <DialogContent
          title={t("giving.gift.attachTitle", { who: gift.label })}
          closeLabel={t("common.close")}
        >
          <div className="flex flex-col gap-4">
            {error ? <Banner tone="danger" title={t("giving.failed")}>{error}</Banner> : null}

            <Field label={t("giving.gift.giver")} required>
              <Picker
                name="memberId"
                defaultValue={null}
                options={hits.map((one) => ({ value: one.id, label: one.name }))}
                label={t("giving.gift.giver")}
                onChange={setMemberId}
                onQuery={(query) => {
                  if (query.trim().length < 2) {
                    setHits([]);
                    return;
                  }
                  void findGiver(query, church).then(setHits);
                }}
              />
            </Field>
          </div>

          <DialogFooter>
            <Button variant="ghost" data-dismiss onClick={() => setOpen(false)}>
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
                    setOpen(false);
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

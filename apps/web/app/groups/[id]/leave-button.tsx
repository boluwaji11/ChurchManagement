"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import {
  Banner, Button, Dialog, DialogContent, DialogFooter,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { leaveMine } from "../actions";

/**
 * R9.4, R17.5. Taking yourself out of a group.
 *
 * Asked about first, because it comes off the roster the leader reads on a
 * Tuesday night and somebody who meant to press the tab beside it should not
 * find out next week. The sentence says what happens, which is that the record
 * of having been in it stays.
 */
export function LeaveButton({
  church,
  groupId,
  groupName,
}: {
  church: string;
  groupId: string;
  groupName: string;
}) {
  const router = useRouter();
  const [asking, setAsking] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  return (
    <>
      {/* Sized to the badge it sits beside, so the pair reads as one line
          rather than a badge with a page control next to it. */}
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() => setAsking(true)}
        className="min-h-8 px-3 text-caption [&_svg]:size-3.5"
      >
        <LogOut /> {t("group.leave")}
      </Button>

      <Dialog open={asking} onOpenChange={(open) => { if (!open) setAsking(false); }}>
        <DialogContent
          alert
          title={t("group.leaveAsk", { group: groupName })}
          closeLabel={t("action.cancel")}
        >
          <p className="text-[length:var(--d-text-body)] text-fg-muted">
            {t("group.leaveWhat")}
          </p>

          {error ? <Banner tone="danger" title={t("find.failed")}>{error}</Banner> : null}

          <DialogFooter>
            <Button variant="secondary" onClick={() => setAsking(false)}>
              {t("action.cancel")}
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const back = await leaveMine(groupId, church);
                  setError(back.error);
                  if (!back.error) {
                    setAsking(false);
                    router.refresh();
                  }
                })
              }
            >
              {t("group.leaveDo")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

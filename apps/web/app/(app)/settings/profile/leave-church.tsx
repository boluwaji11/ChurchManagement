"use client";

import * as React from "react";
import { LogOut } from "lucide-react";
import {
  Button, Dialog, DialogTrigger, DialogContent, DialogClose, DialogFooter, Banner, Tooltip,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { leaveThisChurch } from "./actions";

/**
 * R1.4. Walking out of a church, with a question first.
 *
 * The one owner left cannot, because a church with no owner is a church
 * nobody can administer and the members it belongs to cannot fix it
 * themselves. The button says so where they would press it rather than
 * answering the press with a refusal.
 */
export function LeaveChurch({ name, alone }: { name: string; alone: boolean }) {
  const [going, start] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  if (alone) {
    return (
      <Tooltip content={t("settings.profile.leave.owner")}>
        <span>
          <Button type="button" variant="ghost" disabled className="h-9 px-2.5">
            <LogOut /> {t("settings.profile.leave")}
          </Button>
        </span>
      </Tooltip>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" className="h-9 px-2.5 text-danger">
          <LogOut /> {t("settings.profile.leave")}
        </Button>
      </DialogTrigger>
      <DialogContent alert title={t("settings.profile.leave.title", { name })}>
        <p className="mb-5 text-[length:var(--d-text-body)] text-fg">
          {t("settings.profile.leave.body", { name })}
        </p>
        {error ? <Banner tone="danger">{error}</Banner> : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" data-dismiss disabled={going}>{t("action.cancel")}</Button>
          </DialogClose>
          <Button
            variant="danger"
            loading={going}
            onClick={() =>
              start(async () => {
                const answer = await leaveThisChurch();
                if (answer?.error) setError(answer.error);
              })
            }
          >
            {going ? t("settings.profile.leaving") : t("settings.profile.leave.go")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

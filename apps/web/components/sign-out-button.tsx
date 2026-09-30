"use client";

import { LogOut } from "lucide-react";
import {
  Button, Dialog, DialogTrigger, DialogContent, DialogClose,
} from "@hearth/ui";
import { t } from "@hearth/i18n";

/**
 * Signing out, with a question first.
 *
 * On a shared church computer this is the press that ends somebody else's
 * afternoon of data entry, and it sits next to the name people aim for. The
 * form posts rather than calling an action, so it still works without
 * JavaScript once the dialog is open.
 */
export function SignOutButton({ label }: { label?: string }) {
  const text = label ?? t("action.signOut");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="secondary">
          <LogOut /> {text}
        </Button>
      </DialogTrigger>
      <DialogContent title={t("signOut.confirmTitle")} closeLabel={t("common.close")}>
        <div className="flex flex-wrap items-center gap-3">
          <form action="/auth/sign-out" method="post">
            <Button type="submit" variant="danger">
              <LogOut /> {text}
            </Button>
          </form>
          <DialogClose asChild>
            <Button variant="ghost">{t("action.cancel")}</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

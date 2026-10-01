"use client";

import { LogOut } from "lucide-react";
import {
  Button, Dialog, DialogTrigger, DialogContent, DialogClose, DialogFooter,
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
      <DialogContent alert title={t("signOut.confirmTitle")}>
        <p className="mb-5 text-[length:var(--d-text-body)] text-fg">
          {t("signOut.confirmBody")}
        </p>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" data-dismiss>{t("signOut.stay")}</Button>
          </DialogClose>
          <form action="/auth/sign-out" method="post">
            <Button type="submit" variant="danger">
              <LogOut /> {text}
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

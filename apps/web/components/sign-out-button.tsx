"use client";

import { LogOut } from "lucide-react";
import {
  Button, Dialog, DialogTrigger, DialogContent, DialogClose, DialogFooter,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { clearSectionMemory } from "./shell/section-memory";

/**
 * Signing out, with a question first.
 *
 * On a shared church computer this is the press that ends somebody else's
 * afternoon of data entry, and it sits next to the name members aim for. The
 * form posts rather than calling an action, so it still works without
 * JavaScript once the dialog is open.
 */
export function SignOutButton({ label, compact }: { label?: string; compact?: boolean }) {
  const text = label ?? t("action.signOut");

  return (
    <Dialog>
      <DialogTrigger asChild>
        {/* In the sidebar it is a quiet row rather than a second filled button
            under the person's own name. */}
        {compact ? (
          <Button type="button" variant="ghost" className="h-9 justify-start px-2.5 text-fg-muted">
            <LogOut /> {text}
          </Button>
        ) : (
          <Button type="button" variant="secondary">
            <LogOut /> {text}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent alert title={t("signOut.confirmTitle")}>
        <p className="mb-5 text-[length:var(--d-text-body)] text-fg">
          {t("signOut.confirmBody")}
        </p>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" data-dismiss>{t("signOut.stay")}</Button>
          </DialogClose>
          <form action="/auth/sign-out" method="post" onSubmit={() => clearSectionMemory()}>
            <Button type="submit" variant="danger">
              <LogOut /> {text}
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

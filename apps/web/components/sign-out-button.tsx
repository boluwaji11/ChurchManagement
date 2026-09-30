import { Button } from "@hearth/ui";
import { LogOut } from "lucide-react";
import { t } from "@hearth/i18n";

export function SignOutButton({ label }: { label?: string }) {
  return (
    <form action="/auth/sign-out" method="post">
      <Button type="submit" variant="secondary">
        <LogOut /> {label ?? t("action.signOut")}
      </Button>
    </form>
  );
}

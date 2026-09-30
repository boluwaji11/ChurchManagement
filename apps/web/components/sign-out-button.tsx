import { Button } from "@hearth/ui";
import { LogOut } from "lucide-react";

export function SignOutButton({ label = "Sign out" }: { label?: string }) {
  return (
    <form action="/auth/sign-out" method="post">
      <Button type="submit" variant="secondary">
        <LogOut /> {label}
      </Button>
    </form>
  );
}

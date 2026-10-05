import { redirect } from "next/navigation";
import { Card } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Logo } from "@/components/brand";
import { currentUser } from "@/lib/session";
import { ResetForm } from "./form";

export const dynamic = "force-dynamic";

/**
 * R1.8. Choosing a password, after a link has proved the address.
 *
 * Reached only with a session, which the recovery link creates. Somebody who
 * opens this URL cold is sent to sign in.
 */
export default async function ResetPage() {
  if (!(await currentUser())) redirect("/sign-in");

  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-10">
      <Logo />
      <h1 className="font-display text-display text-fg">{t("reset.title")}</h1>
      <Card>
        <ResetForm />
      </Card>
    </main>
  );
}

import { redirect } from "next/navigation";
import { Banner } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { currentUser } from "@/lib/session";
import { landingFor } from "@/lib/landing";
import { AuthShell } from "../auth-shell";
import { ForgotForm } from "./form";
import { publicTab } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata() {
  return publicTab(t("forgot.title"));
}

/**
 * R1.8. Asking for a link to set a password again.
 *
 * Its own screen rather than a press on the sign-in form. There it shared the
 * email box with signing in, so pressing it before typing anything answered
 * with the sign-in form's own complaint, about a form nobody was filling in.
 */
export default async function ForgotPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const signedIn = await currentUser();
  if (signedIn) redirect(await landingFor(signedIn.id));

  return (
    <AuthShell
      title={t("forgot.title")}
      width="max-w-[460px]"
      back={{ href: "/sign-in", label: t("forgot.back") }}
    >
      {params.error ? <Banner tone="danger">{params.error}</Banner> : null}

      <ForgotForm />
    </AuthShell>
  );
}

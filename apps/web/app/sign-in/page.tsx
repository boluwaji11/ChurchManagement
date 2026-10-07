import Link from "next/link";
import { redirect } from "next/navigation";
import { Banner } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Flash } from "@/components/said";
import { currentUser } from "@/lib/session";
import { landingFor } from "@/lib/landing";
import { AuthShell } from "../auth-shell";
import { SignInForm } from "./form";
import { publicTab } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata() {
  return publicTab(t("signIn.title"));
}

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string; sent?: string; next?: string; set?: string; taken?: string;
  }>;
}) {
  const params = await searchParams;
  const signedIn = await currentUser();
  // R24.6. Somebody who is already signed in and presses Sign in on the website
  // goes where signing in would have put them, rather than to the directory.
  if (signedIn) redirect(params.next ?? (await landingFor(signedIn.id)));

  return (
    <AuthShell
      title={t("signIn.title")}
      footer={
        <>
          {/* R8.1. A volunteer at check-in has no account and does not need
              one. The tablet is paired once and stays in station mode. */}
          {t("signIn.volunteer")}{" "}
          <Link href="/checkin/station" className="font-medium text-primary">
            {t("signIn.openStation")}
          </Link>
        </>
      }
    >
      {params.error ? (
        <Banner tone="danger" title={t("signIn.failed")}>{params.error}</Banner>
      ) : null}

      {params.sent ? (
        <Banner tone="success" title={t("signIn.sent.title")}>
          {t("signIn.sent.body", { email: params.sent })}
        </Banner>
      ) : null}

      {/* R24.9. A confirmation puts itself away. The line above it stays:
          "check your email" is an instruction, and somebody who loses it has
          lost the only thing telling them what to do next. */}
      {params.set ? <Flash message={t("signIn.set")} /> : null}
      {params.taken ? <Banner tone="info" title={t("auth.error.taken")} /> : null}

      <SignInForm next={params.next} email={params.taken} />
    </AuthShell>
  );
}

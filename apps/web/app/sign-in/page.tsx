import Link from "next/link";
import { redirect } from "next/navigation";
import { Banner } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { currentUser } from "@/lib/session";
import { AuthShell } from "../auth-shell";
import { SignInForm } from "./form";

export const dynamic = "force-dynamic";

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string; sent?: string; next?: string; set?: string; taken?: string;
  }>;
}) {
  const params = await searchParams;
  if (await currentUser()) redirect(params.next ?? "/members");

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

      {params.set ? <Banner tone="success" title={t("signIn.set")} /> : null}
      {params.taken ? <Banner tone="info" title={t("auth.error.taken")} /> : null}

      <SignInForm next={params.next} email={params.taken} />
    </AuthShell>
  );
}

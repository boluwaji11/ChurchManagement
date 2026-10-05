import { redirect } from "next/navigation";
import { Banner } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { currentUser } from "@/lib/session";
import { AuthShell } from "../auth-shell";
import { SignUpForm } from "./form";

export const dynamic = "force-dynamic";

/** R1.7, R22.1. Where somebody with no account begins. */
export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; sent?: string }>;
}) {
  const params = await searchParams;
  if (await currentUser()) redirect(params.next ?? "/choose-church");

  return (
    <AuthShell title={t("signUp.title")} under={t("signUp.free")} width="max-w-[520px]">
      {params.error ? (
        <Banner tone="danger" title={t("signUp.failed")}>{params.error}</Banner>
      ) : null}

      {params.sent ? (
        <Banner tone="success" title={t("signUp.sent.title")}>
          {t("signUp.sent.body", { email: params.sent })}
        </Banner>
      ) : (
        <SignUpForm next={params.next} />
      )}
    </AuthShell>
  );
}

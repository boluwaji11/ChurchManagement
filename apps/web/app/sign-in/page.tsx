import { redirect } from "next/navigation";
import { Banner } from "@hearth/ui";
import { currentUser } from "@/lib/session";
import { SignInForm } from "./form";
import { Logo } from "@/components/brand";
import { t } from "@hearth/i18n";

export const dynamic = "force-dynamic";

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string; sent?: string; next?: string; set?: string; taken?: string;
  }>;
}) {
  const params = await searchParams;
  if (await currentUser()) redirect(params.next ?? "/people");

  return (
    <main id="main" className="grid min-h-dvh place-items-center px-6 py-16">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Logo size="lg" />
          <h1 className="font-display text-display text-fg">{t("signIn.title")}</h1>
        </div>

        {params.error ? (
          <Banner tone="danger" title={t("signIn.failed")}>
            {params.error}
          </Banner>
        ) : null}

        {params.sent ? (
          <Banner tone="success" title={t("signIn.sent.title")}>
            {t("signIn.sent.body", { email: params.sent })}
          </Banner>
        ) : null}

        {params.set ? <Banner tone="success" title={t("signIn.set")} /> : null}

        {params.taken ? <Banner tone="info" title={t("auth.error.taken")} /> : null}

        <SignInForm next={params.next} email={params.taken} />
      </div>
    </main>
  );
}

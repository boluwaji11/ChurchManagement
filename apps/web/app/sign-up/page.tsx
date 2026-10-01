import { redirect } from "next/navigation";
import { Banner, Card } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { Logo } from "@/components/brand";
import { currentUser } from "@/lib/session";
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
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-10">
      <Logo />

      <h1 className="font-display text-display text-fg">{t("signUp.title")}</h1>

      {params.error ? (
        <Banner tone="danger" title={t("signUp.failed")}>{params.error}</Banner>
      ) : null}

      {params.sent ? (
        <Banner tone="success" title={t("signUp.sent.title")}>
          {t("signUp.sent.body", { email: params.sent })}
        </Banner>
      ) : (
        <Card>
          <SignUpForm next={params.next} />
        </Card>
      )}
    </main>
  );
}

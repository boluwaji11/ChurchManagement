import { redirect } from "next/navigation";
import Link from "next/link";
import { churchForJoinCode, normaliseJoinCode } from "@connectapp/db";
import { Banner, Button } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { BrandBar } from "@/components/brand";
import { SignOutButton } from "@/components/sign-out-button";
import { currentUser } from "@/lib/session";
import { JoinNow } from "./join-now";

export const dynamic = "force-dynamic";

/**
 * R1.7, R22.1. The door a church points its congregation at.
 *
 * Signing up here is a claim on a record the church already holds, so the
 * address is the whole of the question. Everything that decides the answer is
 * in the repo layer. This screen says which church, and gets out of the way.
 */
export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { code } = await params;
  const { error } = await searchParams;
  const value = normaliseJoinCode(code);
  const church = await churchForJoinCode(value);
  const user = await currentUser();

  if (!church) {
    return (
      <div className="flex min-h-dvh flex-col">
        <BrandBar />
        <main id="main" className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 px-6 py-12">
          <Banner tone="warning" title={t("join.error.code")} />
          <Button variant="secondary" asChild full>
            <Link href="/sign-in">{t("home.signIn")}</Link>
          </Button>
        </main>
      </div>
    );
  }

  if (user?.emailVerified === false) redirect(`/sign-up?sent=${encodeURIComponent(user.email)}`);

  return (
    <div className="flex min-h-dvh flex-col">
      <BrandBar right={user ? <SignOutButton /> : undefined} />

      <main id="main" className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 px-6 py-12">
        <h1 className="font-display text-display text-fg">
          {t("join.heading", { name: church.name })}
        </h1>

        {error ? <Banner tone="danger" title={error} /> : null}

        {user ? (
          <JoinNow code={value} />
        ) : (
          <div className="flex flex-col gap-3">
            <Button asChild full>
              <Link href={`/sign-up?next=${encodeURIComponent(`/join/${value}`)}`}>
                {t("join.createAccount")}
              </Link>
            </Button>
            <Button variant="secondary" asChild full>
              <Link href={`/sign-in?next=${encodeURIComponent(`/join/${value}`)}`}>
                {t("join.signIn")}
              </Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

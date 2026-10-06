import { redirect } from "next/navigation";
import Link from "next/link";
import { churchForSelfSignup } from "@connectapp/db";
import { Banner, Button } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { SignOutButton } from "@/components/sign-out-button";
import { currentUser } from "@/lib/session";
import { AuthShell, AUTH_BUTTON } from "../../auth-shell";
import type { Piece } from "@/components/site/art";
import { JoinNow } from "./join-now";

export const dynamic = "force-dynamic";

const ART: Piece[] = [
  { name: "congregation", side: "left", y: 52, size: 230, inset: 24 },
  { name: "sanctuary", side: "right", y: 52, size: 250, inset: 16 },
];

/**
 * R1.7, R22.1. The church's own door.
 *
 * This used to need a code. It does not: the address says which church, which
 * is the whole of what the code was for, and a church that does not want a
 * public door turns it off rather than rotating a secret.
 *
 * Signing up here is a claim on a record the church already holds, so the email
 * address is the whole of the question. Everything that decides the answer is
 * in the repo layer. This screen says which church, and gets out of the way.
 */
export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ church: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { church: slug } = await params;
  const { error } = await searchParams;
  const church = await churchForSelfSignup(slug);
  const user = await currentUser();

  if (!church) {
    return (
      <AuthShell title={t("join.error.shut")} width="max-w-[460px]">
        <Button variant="secondary" asChild full className={AUTH_BUTTON}>
          <Link href="/sign-in">{t("home.signIn")}</Link>
        </Button>
      </AuthShell>
    );
  }

  if (user?.emailVerified === false) redirect(`/sign-up?sent=${encodeURIComponent(user.email)}`);

  const here = `/join/${church.slug}`;

  return (
    <AuthShell
      title={t("join.heading", { name: church.name })}
      art={ART}
      width="max-w-[460px]"
      footer={user ? <SignOutButton /> : undefined}
    >
      {error ? <Banner tone="danger" title={error} /> : null}

      {user ? (
        <JoinNow church={church.slug} />
      ) : (
        <div className="flex flex-col gap-3">
          <Button asChild full className={AUTH_BUTTON}>
            <Link href={`/sign-up?next=${encodeURIComponent(here)}`}>
              {t("join.createAccount")}
            </Link>
          </Button>
          <Button variant="secondary" asChild full className={AUTH_BUTTON}>
            <Link href={`/sign-in?next=${encodeURIComponent(here)}`}>{t("join.signIn")}</Link>
          </Button>
        </div>
      )}
    </AuthShell>
  );
}

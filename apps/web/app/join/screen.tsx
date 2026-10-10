import { redirect } from "next/navigation";
import Link from "next/link";
import { churchForSelfSignup } from "@connectapp/db";
import { Banner, Button } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { SignOutButton } from "@/components/sign-out-button";
import { currentUser, belongsTo, verifiedMembership } from "@/lib/session";
import { navFor } from "@/components/shell/nav";
import { AuthShell } from "../auth-shell";
import { photoUrls } from "@/lib/photos";
import { AUTH_BUTTON } from "../auth-chrome";
import type { Piece } from "@/components/site/art";
import { JoinNow } from "./[church]/join-now";

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
export async function JoinScreen({
  slug,
  fromHost = false,
  searchParams,
}: {
  slug: string;
  /** Whether the address already names the church. */
  fromHost?: boolean;
  searchParams: Promise<{ error?: string }>;
}) {
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

  /*
   * R1.4, R17.1. Somebody who already belongs here is not at a door.
   *
   * A member arriving at their church's own address has signed in before and
   * is looking for their own screen, so they are taken to it rather than
   * asked to join a church they are already in. Which screen that is comes
   * from the same list the rail is built from, so it is whatever their role
   * opens the product on.
   */
  if (user && (await belongsTo(user.id, church.slug))) {
    const member = await verifiedMembership(user.id, church.slug);
    const [first] = member ? navFor({ role: member.role, permissions: member.permissions }) : [];
    const landing = first?.href ?? "/home";
    /* R17.1. The address already names the church, so the path does not. */
    redirect(fromHost ? landing : `${landing}?church=${church.slug}`);
  }

  /* R17.1. On the church's own address the host names it, so the way back
     after signing in does not repeat it in the path. */
  const here = fromHost ? "/join" : `/join/${church.slug}`;

  /* R1.1. The bucket is private, so the mark is served through a link signed
     for the hour somebody spends on this screen. */
  const signed = church.logoKey ? await photoUrls([church.logoKey]) : {};
  const logoUrl = church.logoKey ? (signed[church.logoKey] ?? null) : null;

  return (
    <AuthShell
      title={t("join.heading", { name: church.name })}
      mark={
        logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            aria-hidden
            className="size-16 rounded-2xl border border-line bg-surface object-contain p-2"
          />
        ) : null
      }
      art={ART}
      width="max-w-[460px]"
      footer={user ? <SignOutButton /> : undefined}
    >
      {error ? <Banner tone="danger">{error}</Banner> : null}

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

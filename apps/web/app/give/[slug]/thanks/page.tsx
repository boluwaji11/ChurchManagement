import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { givingPage } from "@connectapp/db";
import { giftSession } from "../actions";
import { ManageGift } from "./manage";
import { Button } from "@connectapp/ui";
import { currentUser, belongsTo } from "@/lib/session";
import { t } from "@connectapp/i18n";
import { publicTab } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. The church this page belongs to, in the browser tab. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return publicTab(t("nav.giving"), slug);
}

/** R13.6. What a giver reads when Stripe sends them back. */
export default async function ThanksPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session?: string }>;
}) {
  const { slug } = await params;
  const { session } = await searchParams;
  const church = await givingPage(slug);
  if (!church) notFound();

  /*
   * R13.3, R13.6. What they just set up, and whether this church already
   * knows them. Read from the session Stripe handed them, so the page can
   * offer the right next thing rather than offering everything.
   */
  const gift = session
    ? await giftSession(slug, session)
    : { repeating: false, email: null, known: false, pending: false };

  /* R17.4. Somebody already signed in has screens of their own to go back to. */
  /* R17.4. Signed in to this church, which is the only sign-in that has
     screens to go back to from here. */
  const reader = await currentUser();
  const signedIn = Boolean(reader && (await belongsTo(reader.id, slug)));

  return (
    <main className="site-wash grid min-h-dvh place-items-center px-5 py-10">
      <div className="flex w-full max-w-[420px] flex-col items-center gap-4 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-primary-soft text-primary [&_svg]:size-7">
          <Check />
        </span>
        <h1 className="font-display text-[28px] leading-[34px] text-fg">
          {t("give.thanks.title")}
        </h1>
        {/* R13.2. A bank transfer is an instruction, so the giver is told
            what happens next rather than that the money has arrived. */}
        <p className="m-0 text-fg-muted">
          {gift.pending
            ? t("give.thanks.bank", { church: church.name })
            : t("give.thanks.body", { church: church.name })}
        </p>
        {gift.repeating ? (
          <p className="m-0 text-fg-muted">{t("give.thanks.repeat")}</p>
        ) : null}

        {/*
          * R13.3, R17.4. One way on, chosen for whoever is standing here.
          *
          * Somebody already signed in goes back to their own screens, because
          * their giving is on them. Somebody the church knows is offered the
          * way in. Somebody it does not know, where the church's door is
          * open, is offered an account, since a repeating gift is a thing
          * they will want to change one day and a screen in this product
          * beats a page on Stripe. Managing it without an account stays, in
          * smaller print, because nobody should have to make one to stop
          * giving.
          */}
        <div className="flex flex-col items-center gap-3">
          {signedIn ? (
            <Button asChild>
              <Link href={`/giving?church=${church.slug}`}>{t("give.thanks.return")}</Link>
            </Button>
          ) : gift.repeating && session ? (
            <>
              {gift.known ? (
                <Button asChild>
                  <Link href={`/sign-in?next=${encodeURIComponent("/home/giving")}`}>
                    {t("give.thanks.signIn")}
                  </Link>
                </Button>
              ) : church.selfSignup && gift.email ? (
                <Button asChild>
                  <Link
                    href={`/sign-up?next=${encodeURIComponent(`/join/${church.slug}`)}&email=${
                      encodeURIComponent(gift.email)
                    }`}
                  >
                    {t("give.thanks.account")}
                  </Link>
                </Button>
              ) : null}

              <ManageGift
                slug={church.slug}
                session={session}
                quiet={gift.known || (church.selfSignup && Boolean(gift.email))}
              />
            </>
          ) : null}

          <Link href={`/give/${church.slug}`} className="font-medium text-primary">
            {t("give.thanks.again")}
          </Link>
        </div>
      </div>
    </main>
  );
}

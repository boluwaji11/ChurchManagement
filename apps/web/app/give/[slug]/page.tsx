import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { givingPage } from "@connectapp/db";
import { currentUser } from "@/lib/session";
import { t } from "@connectapp/i18n";
import { photoUrls } from "@/lib/photos";
import { GiveForm } from "./give-form";
import { Mark } from "./mark";
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

/**
 * R13.6. The page a church links to from its own website.
 *
 * Whoever lands here has no account and should not need one. One screen, one
 * question, mobile first, in the church's own colour. The card is typed into
 * Stripe's page rather than this one, which is what keeps every church on this
 * platform in PCI scope SAQ-A.
 */
export default async function GivePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const church = await givingPage(slug);
  if (!church) notFound();

  /*
   * R13.6, R17.4. A member who is already signed in is not a stranger.
   *
   * Their name and address fill themselves in, which is the whole benefit of
   * being known here. Nobody is asked to sign in: this page works for a
   * visitor who has never heard of us, and that is the point of it.
   */
  const known = await currentUser();

  const signed = church.logoKey ? await photoUrls([church.logoKey]) : {};
  const logoUrl = church.logoKey ? (signed[church.logoKey] ?? null) : null;

  /* R1.1. A church writes "example.com" rather than a scheme, so one is put
     in front of it. */
  const site = church.website?.trim();
  const homepage = site
    ? /^https?:\/\//i.test(site) ? site : `https://${site}`
    : null;

  return (
    <main className="site-wash grid min-h-dvh place-items-start justify-center px-5 py-10">
      <div className="flex w-full max-w-[460px] flex-col gap-6">
        {/* R17.4. A member came here from their own screens, so the way back
            is to them. A stranger has no back: this page is where they
            started. */}
        {known ? (
          <Link
            href={`/giving?church=${church.slug}`}
            className="flex w-fit items-center gap-1.5 font-medium text-primary no-underline"
          >
            <ArrowLeft className="size-4" aria-hidden /> {t("give.back")}
          </Link>
        ) : null}

        <div className="flex flex-col items-center gap-3 text-center">
          {/* R1.1. The mark opens the church's own website where it has given
              one. Somebody pressing a church's name is reaching for the
              church, and this page is one of its doors rather than the whole
              of it. With no website there is nowhere to go, so it is a mark
              and not a control. */}
          <Mark
            name={church.name}
            logoUrl={logoUrl}
            hue={church.brandHue}
            homepage={homepage}
          />
          <h1 className="font-display text-[28px] leading-[34px] text-fg">
            {t("give.title", { church: church.name })}
          </h1>
        </div>

        <GiveForm
          slug={church.slug}
          church={church.name}
          funds={church.funds}
          accountId={church.accountId}
          giver={{
            name: [known?.firstName, known?.lastName].filter(Boolean).join(" ")
              || known?.fullName
              || "",
            email: known?.email ?? "",
          }}
          publishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""}
        />
      </div>
    </main>
  );
}

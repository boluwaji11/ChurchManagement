import { notFound } from "next/navigation";
import { givingPage } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { photoUrls } from "@/lib/photos";
import { GiveForm } from "./give-form";

export const dynamic = "force-dynamic";

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

  const signed = church.logoKey ? await photoUrls([church.logoKey]) : {};
  const logoUrl = church.logoKey ? (signed[church.logoKey] ?? null) : null;

  return (
    <main className="site-wash grid min-h-dvh place-items-center px-5 py-10">
      <div className="flex w-full max-w-[460px] flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="size-14 rounded-[14px] object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="grid size-14 place-items-center rounded-[14px] font-display text-[24px] text-primary-fg"
              style={{ background: `var(--hue-${church.brandHue}-key)` }}
            >
              {church.name.slice(0, 1)}
            </span>
          )}
          <h1 className="font-display text-[28px] leading-[34px] text-fg">
            {t("give.title", { church: church.name })}
          </h1>
        </div>

        <GiveForm
          slug={church.slug}
          church={church.name}
          funds={church.funds}
          accountId={church.accountId}
          publishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""}
        />
      </div>
    </main>
  );
}

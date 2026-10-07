import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { givingPage } from "@connectapp/db";
import { wasRepeating } from "../actions";
import { ManageGift } from "./manage";
import { Button } from "@connectapp/ui";
import { t } from "@connectapp/i18n";

export const dynamic = "force-dynamic";

/** A church writes its address with or without the scheme; a link needs one. */
const siteOf = (website: string): string =>
  /^https?:\/\//i.test(website) ? website : `https://${website}`;

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

  // R13.3. Only a repeating gift has anything to manage.
  const repeating = session ? await wasRepeating(slug, session) : false;

  return (
    <main className="site-wash grid min-h-dvh place-items-center px-5 py-10">
      <div className="flex w-full max-w-[420px] flex-col items-center gap-4 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-primary-soft text-primary [&_svg]:size-7">
          <Check />
        </span>
        <h1 className="font-display text-[28px] leading-[34px] text-fg">
          {t("give.thanks.title")}
        </h1>
        <p className="m-0 text-fg-muted">
          {t("give.thanks.body", { church: church.name })}
        </p>
        {repeating ? (
          <p className="m-0 text-fg-muted">{t("give.thanks.repeat")}</p>
        ) : null}
        {repeating && session ? <ManageGift slug={church.slug} session={session} /> : null}
        {/* R13.6. A giver came from the church's own website, and that is
            where they are going back to. Giving again is the quieter of the
            two, because somebody who has just given is done. */}
        <div className="flex flex-col items-center gap-3">
          {church.website ? (
            <Button asChild>
              <a href={siteOf(church.website)}>
                {t("give.thanks.home", { church: church.name })}
              </a>
            </Button>
          ) : null}

          <Link href={`/give/${church.slug}`} className="font-medium text-primary">
            {t("give.thanks.again")}
          </Link>
        </div>
      </div>
    </main>
  );
}

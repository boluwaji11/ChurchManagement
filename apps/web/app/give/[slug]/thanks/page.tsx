import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { givingPage } from "@connectapp/db";
import { t } from "@connectapp/i18n";

export const dynamic = "force-dynamic";

/** R13.6. What a giver reads when Stripe sends them back. */
export default async function ThanksPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const church = await givingPage(slug);
  if (!church) notFound();

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
        <Link href={`/give/${church.slug}`} className="font-medium text-primary">
          {t("give.thanks.again")}
        </Link>
      </div>
    </main>
  );
}

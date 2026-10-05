import Link from "next/link";
import { ArrowRight, Check, Clock } from "lucide-react";
import { Button, Card, Separator } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Logo } from "@/components/brand";
import { StartDemoButton } from "./demo/start";

export const dynamic = "force-dynamic";

const NOW = ["members", "directory", "tags", "merge", "records", "import"] as const;
const SOON = ["attendance", "groups", "giving", "events", "planning", "portal"] as const;
const PRICE = ["tiers", "giving", "messaging"] as const;

/**
 * The page somebody sees before they are anybody.
 *
 * It says what the product holds, what it costs, and why. The split between
 * what is here and what is being built is deliberate: a church choosing
 * software is deciding who to trust with their records, and a page that lists
 * unbuilt features beside built ones has already broken that on the first
 * screen.
 */
export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface/90 px-4 py-3 sm:px-6">
        <Logo />
        <div className="flex flex-wrap items-center gap-2">
          <StartDemoButton />
          <Button variant="ghost" asChild>
            <Link href="/sign-in">{t("home.signIn")}</Link>
          </Button>
          <Button asChild>
            <Link href="/sign-up?next=/create-church">
              {t("createChurch.title")}
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </header>

      <main id="main" className="flex flex-1 flex-col">
        <section className="mx-auto w-full max-w-4xl px-6 py-20 sm:py-28">
          <h1 className="max-w-3xl font-display text-display-lg text-fg">{t("home.headline")}</h1>
          <p className="mt-5 max-w-2xl text-body-lg text-fg-muted">{t("home.sub")}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link href="/sign-up?next=/create-church">
                {t("createChurch.title")}
                <ArrowRight />
              </Link>
            </Button>
            <StartDemoButton />
          </div>
        </section>

        <section className="border-t border-line bg-surface">
          <div className="mx-auto grid w-full max-w-4xl gap-8 px-6 py-16 sm:grid-cols-2">
            <div className="flex flex-col gap-3">
              <h2 className="text-heading text-fg">{t("home.now.title")}</h2>
              <ul className="flex flex-col gap-2">
                {NOW.map((key) => (
                  <li key={key} className="flex items-start gap-2.5 text-[length:var(--d-text-body)] text-fg">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                    {t(`home.now.${key}` as never)}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <h2 className="text-heading text-fg">{t("home.soon.title")}</h2>
              <ul className="flex flex-col gap-2">
                {SOON.map((key) => (
                  <li key={key} className="flex items-start gap-2.5 text-[length:var(--d-text-body)] text-fg-muted">
                    <Clock className="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden />
                    {t(`home.soon.${key}` as never)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto w-full max-w-4xl px-6 py-16">
            <h2 className="font-display text-heading text-fg">{t("home.price.title")}</h2>
            <Card className="mt-6">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="font-display text-display text-fg">{t("home.price.amount")}</span>
                <span className="text-body-lg text-fg-muted">{t("home.price.period")}</span>
              </div>
              <Separator className="my-5" />
              <ul className="flex flex-col gap-2">
                {PRICE.map((key) => (
                  <li key={key} className="flex items-start gap-2.5 text-[length:var(--d-text-body)] text-fg">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                    {t(`home.price.${key}` as never)}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </section>

        <section className="border-t border-line bg-surface">
          <div className="mx-auto w-full max-w-3xl px-6 py-16">
            <h2 className="font-display text-heading text-fg">{t("home.free.title")}</h2>
            <p className="mt-4 text-body-lg text-fg-muted">{t("home.free.body")}</p>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-start gap-5 px-6 py-20">
            <h2 className="font-display text-heading text-fg">{t("home.end.title")}</h2>
            <div className="flex flex-wrap items-center gap-3">
              <StartDemoButton />
              <Button variant="secondary" asChild>
                <Link href="/sign-up?next=/create-church">{t("createChurch.title")}</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* R21.12. The promises, where somebody deciding whether to trust us with
          a congregation's records can read them before making an account. */}
      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-4 px-6 py-8">
          <Link href="/trust" className="text-label text-fg-muted hover:text-fg">
            {t("trust.title")}
          </Link>
        </div>
      </footer>
    </div>
  );
}

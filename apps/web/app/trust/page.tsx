import { Card, Separator } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { SiteBar, SiteFooter } from "@/components/site/chrome";
import { Art, type Piece } from "@/components/site/art";

export const dynamic = "force-static";

/**
 * R21.12, R21.13. The promises, where a church can read them before signing up.
 *
 * Trust in a free product has to be structural rather than asserted, so each of
 * these says what holds us to it: a licence, an export that we depend on
 * ourselves, a test that fails the build. A promise with nothing behind it is
 * marketing, and a church choosing who holds its records can tell the
 * difference.
 *
 * Signed out on purpose. The question "what will you do with our records" is
 * asked before an account exists, and a page behind a sign-in cannot answer it.
 */

const PROMISES = ["training", "export", "source", "winddown", "money"] as const;
const PROCESSORS = ["supabase", "vercel", "stripe"] as const;

/** The margins of the page a church reads before it trusts anybody. */
const ART: Piece[] = [
  { name: "safe", side: "left", y: 34, size: 190, inset: 32 },
  { name: "connecting", side: "right", y: 48, size: 220, inset: 28 },
];

export default function TrustPage() {
  return (
    <div data-theme="light" className="site-wash relative flex min-h-dvh flex-col">
      <Art pieces={ART} />
      <SiteBar />

      <main id="main" className="relative mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6">
        <h1 className="mb-10 text-center font-display text-display text-fg">{t("trust.title")}</h1>

        <div className="flex flex-col gap-6">
          {PROMISES.map((promise) => (
            <Card key={promise} className="flex flex-col gap-2 p-6">
              <h2 className="font-display text-heading text-fg">
                {t(`trust.${promise}.title` as never)}
              </h2>
              <p className="text-[length:var(--d-text-body)] text-fg-muted">
                {t(`trust.${promise}.body` as never)}
              </p>
            </Card>
          ))}

          <Card className="flex flex-col gap-3 p-6">
            <h2 className="font-display text-heading text-fg">{t("trust.who.title")}</h2>
            <p className="text-[length:var(--d-text-body)] text-fg-muted">
              {t("trust.who.body")}
            </p>
            <Separator />
            <ul className="flex flex-col gap-2">
              {PROCESSORS.map((who) => (
                <li key={who} className="text-[length:var(--d-text-body)] text-fg">
                  {t(`trust.who.${who}` as never)}
                </li>
              ))}
            </ul>
          </Card>
        </div>

      </main>

      <SiteFooter />
    </div>
  );
}

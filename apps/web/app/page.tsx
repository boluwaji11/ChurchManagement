import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button, Card, CardTitle } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { Logo } from "@/components/brand";
import { StartDemoButton } from "./demo/start";

export const dynamic = "force-dynamic";

/**
 * The page somebody sees before they are anybody.
 *
 * It makes the cost argument once and then says what the product does. A church
 * deciding whether to look further needs three facts and a way in, and the way
 * in that costs them least is the demo.
 */
const POINTS = ["free", "simple", "yours", "sunday"] as const;

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Logo />
        <div className="flex flex-wrap items-center gap-2">
          <StartDemoButton />
          <Button variant="ghost" asChild>
            <Link href="/sign-in">{t("home.signIn")}</Link>
          </Button>
          <Button asChild>
            <Link href="/create-church">
              {t("createChurch.title")}
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-12 px-6 py-16 sm:py-24">
        <div className="flex flex-col gap-5">
          <h1 className="max-w-2xl font-display text-display text-fg">{t("home.headline")}</h1>
          <p className="max-w-2xl text-body-lg text-fg-muted">{t("home.sub")}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {POINTS.map((point) => (
            <Card key={point} className="flex flex-col gap-2">
              <CardTitle>{t(`home.point.${point}.title` as never)}</CardTitle>
              <p className="text-[length:var(--d-text-body)] text-fg-muted">
                {t(`home.point.${point}.body` as never)}
              </p>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { Logo } from "@/components/brand";
import { StartDemoButton } from "./demo/start";

export const dynamic = "force-dynamic";

/** The page somebody sees before they are anybody. A claim and a way in. */
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

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-6 py-20">
        <h1 className="font-display text-display text-fg">{t("home.headline")}</h1>
        <p className="text-body-lg text-fg-muted">{t("home.sub")}</p>
      </main>
    </div>
  );
}

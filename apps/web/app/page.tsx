import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { Logo } from "@/components/brand";

export default function Home() {
  return (
    <main className="min-h-dvh grid place-items-center px-6 py-16">
      <div className="flex w-full max-w-xl flex-col items-start gap-6">
        <Logo size="lg" />

        <p className="text-body-lg text-fg-muted">{t("home.tagline")}</p>

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/sign-in">
              {t("home.signIn")}
              <ArrowRight />
            </Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/create-church">{t("createChurch.title")}</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

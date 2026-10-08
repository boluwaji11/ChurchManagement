import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/**
 * R24.9. What the reader gets when the thing is not there.
 *
 * A record archived while a tab was open, a link somebody copied out of an
 * email a year ago, or an address typed wrong. All the same to the reader,
 * so all one answer, with the way back on it.
 */
export default function NotFound() {
  return (
    <main className="site-wash grid min-h-dvh place-items-center px-6 py-10">
      <div className="flex max-w-[420px] flex-col items-center gap-4 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-sunken text-fg-muted [&_svg]:size-5">
          <SearchX aria-hidden />
        </span>

        <span className="flex flex-col gap-1.5">
          <span className="font-display text-[22px] leading-7 text-fg">
            {t("missing.title")}
          </span>
          <span className="text-[length:var(--d-text-body)] text-fg-muted">
            {t("missing.body")}
          </span>
        </span>

        <Button asChild variant="secondary">
          <Link href="/">{t("missing.back")}</Link>
        </Button>
      </div>
    </main>
  );
}

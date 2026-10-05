import { WifiOff } from "lucide-react";
import { t } from "@connectapp/i18n";

export const dynamic = "force-static";

/**
 * R17.11. What the installed app shows with no signal and nothing cached.
 *
 * Static on purpose: the worker caches this at install, before anybody has
 * lost a connection, so it is the one screen that is certain to be there.
 */
export default function OfflinePage() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-canvas px-6">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <span
          aria-hidden
          className="grid size-14 place-items-center rounded-2xl bg-sunken text-fg-muted"
        >
          <WifiOff className="size-7" />
        </span>
        <h1 className="font-display text-[28px] leading-9 text-fg">{t("offline.title")}</h1>
        <p className="text-[length:var(--d-text-body)] text-fg-muted">{t("offline.body")}</p>
      </div>
    </main>
  );
}

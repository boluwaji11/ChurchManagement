import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { t } from "@hearth/i18n";
import type { PublicEvent } from "@hearth/db";
import { Register } from "@/app/e/[slug]/[event]/register";

/**
 * R14.2, R14.6. The registration itself, on a page of its own.
 *
 * Reading about a camp and filling in four children's medical details are two
 * different jobs, and one long page makes the reading feel like paperwork. The
 * event's page says what it is; this takes the places.
 *
 * One component, so the preview and the page the congregation uses cannot drift
 * apart.
 */
export function RegisterPage({
  event,
  logoUrl,
  churchSlug,
  eventSlug,
  today,
  backHref,
  banner,
  preview = false,
}: {
  event: PublicEvent;
  logoUrl: string | null;
  churchSlug: string;
  eventSlug: string;
  today: string;
  backHref: string;
  banner?: React.ReactNode;
  /** Drawn, and refusing to send, so a preview takes no places. */
  preview?: boolean;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      {banner}

      <header className="px-5 pt-5 pb-1 sm:px-8">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt=""
              aria-hidden
              className="size-11 rounded-xl border border-line bg-surface object-contain p-1"
            />
          ) : null}
          <span className="font-display text-[22px] leading-7 text-fg">
            {event.church.name}
          </span>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 sm:px-8 sm:py-12">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 font-medium text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t("publicEvent.back", { name: event.name })}
        </Link>

        <h1 className="mt-6 font-display text-[28px] leading-[34px] text-fg sm:text-[32px] sm:leading-[38px]">
          {t("publicEvent.who")}
        </h1>

        <div className="mt-7">
          <Register
            churchSlug={churchSlug}
            eventSlug={eventSlug}
            today={today}
            state={event.state}
            questions={event.questions}
            preview={preview}
          />
        </div>
      </main>
    </div>
  );
}

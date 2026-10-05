import * as React from "react";
import Link from "next/link";
import { withTenant, getChurch } from "@connectapp/db";
import { t, spellingFor } from "@connectapp/i18n";
import { FlameMark } from "./brand";
import { ChurchMarkProvider } from "./church-mark";
import { SpellingProvider } from "./spelling-provider";
import { DemoBanner } from "./demo-banner";
import { PortalTabs, PortalAccount, type PortalTab } from "./portal/tabs";
import { Installed } from "./portal/installed";
import { PortalTitle, PortalSection, Panel } from "./portal/panel";
import { PublicFooter } from "./public-footer";
import { supabaseServer } from "@/lib/supabase/server";
import { readsAs } from "@/lib/spelling";
import type { Session } from "@/lib/session";

export { PortalTitle, PortalSection, Panel };

/**
 * R17.1. The frame a member's screens sit in.
 *
 * A different frame from the one staff work in, which is what the redesign
 * calls for and why it is its own component. Staff live in the product all week
 * and want a sidebar they can scan. A member opens it two or three times a
 * year, usually on a phone and usually because the church asked them
 * something, so the church's name leads, four tabs sit under it, and the
 * content is one centred column with nothing down the side.
 *
 * Measurements are the design's: a 64px sticky bar, 1120px of content, 24px at
 * the sides, 32px above and 96px below, 28px between blocks.
 */
export async function PortalShell({
  session,
  tabs,
  children,
}: {
  session: Session;
  tabs?: PortalTab[];
  children: React.ReactNode;
}) {
  const church = await withTenant(
    {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      permissions: session.permissions,
    },
    (tx) => getChurch(tx, session.tenantId),
  );

  const spelling = spellingFor(church?.country);
  readsAs(church?.country);

  // The bucket is private, so the logo is served through a URL signed for an
  // hour. Every portal screen is force-dynamic, so a tab left open overnight
  // gets a fresh one on its next navigation.
  let logoUrl: string | null = null;
  if (church?.logoKey) {
    const supabase = await supabaseServer();
    const signed = await supabase.storage.from("church").createSignedUrl(church.logoKey, 3600);
    logoUrl = signed.data?.signedUrl ?? null;
  }

  const slug = session.tenantSlug;
  const theTabs: PortalTab[] = tabs ?? [
    { label: t("nav.home"), href: "/home" },
    { label: t("nav.events"), href: "/events" },
    { label: t("nav.groups"), href: "/groups" },
    { label: t("nav.serving"), href: "/home/serving" },
    { label: t("nav.myHousehold"), href: "/home/household" },
  ];

  /*
   * R1.1. The mark opens the church's own website where it has given one.
   * Somebody pressing a church's name is reaching for the church, and the
   * portal is one of its doors rather than the whole of it.
   */
  const site = church?.website?.trim();
  const homepage = site
    ? /^https?:\/\//i.test(site) ? site : `https://${site}`
    : null;

  return (
    <div className="flex min-h-dvh flex-col bg-canvas" data-density="portal">
      {/* R17.11. What a phone reads when somebody adds this church to their
          home screen, and the worker that keeps it answering with no signal.
          React hoists both into the head. */}
      <link rel="manifest" href={`/manifest.webmanifest?church=${slug}`} />
      <meta name="theme-color" content="#faf8f5" />
      <Installed />

      <DemoBanner tenantId={session.tenantId} />

      <header className="sticky top-0 z-20 border-b border-line bg-canvas">
        <div className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center gap-x-6 gap-y-1 px-6">
          {homepage ? (
            <a
              href={homepage}
              target="_blank"
              rel="noreferrer noopener"
              title={t("portal.churchSite", { church: session.tenantName })}
              className="flex min-h-14 shrink-0 items-center gap-2.5"
            >
              <FlameMark size={32} logoUrl={logoUrl} churchName={session.tenantName} />
              <span className="max-w-[220px] truncate font-display text-[19px] leading-6 text-fg">
                {session.tenantName}
              </span>
            </a>
          ) : (
            <Link
              href={`/home?church=${slug}`}
              className="flex min-h-14 shrink-0 items-center gap-2.5"
            >
              <FlameMark size={32} logoUrl={logoUrl} churchName={session.tenantName} />
              <span className="max-w-[220px] truncate font-display text-[19px] leading-6 text-fg">
                {session.tenantName}
              </span>
            </Link>
          )}

          <PortalTabs tabs={theTabs} church={slug} />

          <PortalAccount name={session.displayName} userId={session.userId} church={slug} />
        </div>
      </header>

      <main
        id="main"
        className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-7 px-6 pb-16 pt-8"
      >
        <ChurchMarkProvider logoUrl={logoUrl}>
          <SpellingProvider spelling={spelling}>{children}</SpellingProvider>
        </ChurchMarkProvider>
      </main>

      {/* R1.1. Who to reach, the same line the church's public pages carry. */}
      <PublicFooter
        church={{
          slug,
          name: session.tenantName,
          brandHue: church?.brandHue ?? "indigo",
          phone: church?.phone ?? null,
          email: church?.email ?? null,
          website: church?.website ?? null,
          logoKey: church?.logoKey ?? null,
        }}
      />
    </div>
  );
}

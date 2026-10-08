import { notFound } from "next/navigation";
import { publicEvent, publicChurchTimezone } from "@connectapp/db";
import { supabaseServer } from "@/lib/supabase/server";
import { churchNow } from "@/lib/church-now";
import { EventPage } from "@/components/event-page";
import { publicTab } from "@/lib/page-metadata";
import { PortalShell } from "@/components/portal-shell";
import { BackLink } from "@/components/back-link";
import { portalReader } from "@/lib/portal-reader";
import { t } from "@connectapp/i18n";

export const dynamic = "force-dynamic";

/** R17.1. The church this page belongs to, in the browser tab. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return publicTab(t("nav.events"), slug);
}

/**
 * R14.2, R17.1. The event page a church links to from its own website.
 *
 * Whoever follows it has no account and should not need one to say they are
 * coming to the picnic.
 *
 * A member of this church reading the same address gets it inside the portal
 * instead: they opened it from their own Events tab, and the public frame
 * dropped them onto the open web with the church's name at the top and no way
 * back to the tabs they came from. One address either way, so a link in a
 * text message and a press in the portal lead to the same place.
 */
export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ slug: string; event: string }>;
}) {
  const { slug, event } = await params;

  // The church's own date, so an event closing on the 6th is open all of the
  // 6th wherever the reader happens to be.
  const clock = churchNow(await publicChurchTimezone(slug));

  const found = await publicEvent(slug, event, clock.date, clock.time);
  if (!found) notFound();

  const inPortal = await portalReader(slug);

  const supabase = await supabaseServer();
  const sign = async (key: string | null) => {
    if (!key) return null;
    const signed = await supabase.storage.from("church").createSignedUrl(key, 3600);
    return signed.data?.signedUrl ?? null;
  };

  const page = (
    <EventPage
      event={found}
      coverUrl={await sign(found.coverKey)}
      logoUrl={await sign(found.church.logoKey)}
      registerHref={`/e/${slug}/${event}/register`}
      bare={Boolean(inPortal)}
    />
  );

  if (!inPortal) return page;

  return (
    <PortalShell session={inPortal} tab={t("nav.events")}>
      <BackLink href={`/events?church=${slug}`} label={t("nav.events")} />
      {page}
    </PortalShell>
  );
}

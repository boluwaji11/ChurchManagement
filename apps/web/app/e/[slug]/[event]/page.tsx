import { notFound } from "next/navigation";
import { publicEvent, publicChurchTimezone } from "@hearth/db";
import { supabaseServer } from "@/lib/supabase/server";
import { churchNow } from "@/lib/church-now";
import { EventPage } from "@/components/event-page";

export const dynamic = "force-dynamic";

/**
 * R14.2. The event page a church links to from its own website.
 *
 * Whoever follows it has no account and should not need one to say they are
 * coming to the picnic.
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

  const supabase = await supabaseServer();
  const sign = async (key: string | null) => {
    if (!key) return null;
    const signed = await supabase.storage.from("church").createSignedUrl(key, 3600);
    return signed.data?.signedUrl ?? null;
  };

  return (
    <EventPage
      event={found}
      coverUrl={await sign(found.coverKey)}
      logoUrl={await sign(found.church.logoKey)}
      registerHref={`/f/${slug}/${found.formSlug}?event=${event}`}
    />
  );
}

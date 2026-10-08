import { notFound } from "next/navigation";
import { publicEvent, publicChurchTimezone } from "@connectapp/db";
import { supabaseServer } from "@/lib/supabase/server";
import { churchNow } from "@/lib/church-now";
import { EventRegisterPage } from "@/components/event-register-page";
import { publicTab } from "@/lib/page-metadata";
import { knownRegistrant } from "@/lib/registrant";
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
 * R14.2, R14.6. Taking a place at an event, from the open web.
 *
 * The registration belongs to the event rather than to the form behind it, so
 * the reader never leaves the thing they are signing up for. The form supplies
 * the questions, the event supplies the page.
 */
export default async function RegisterPage({
  params,
}: {
  params: Promise<{ slug: string; event: string }>;
}) {
  const { slug, event } = await params;

  const clock = churchNow(await publicChurchTimezone(slug));
  const found = await publicEvent(slug, event, clock.date, clock.time);
  // An announcement has nothing to register for, so there is no page here.
  if (!found || found.state === "none") notFound();

  const supabase = await supabaseServer();
  const sign = async (key: string | null) => {
    if (!key) return null;
    const signed = await supabase.storage.from("church").createSignedUrl(key, 3600);
    return signed.data?.signedUrl ?? null;
  };

  return (
    <EventRegisterPage
      event={found}
      churchSlug={slug}
      eventSlug={event}
      today={clock.date}
      coverUrl={await sign(found.coverKey)}
      logoUrl={await sign(found.church.logoKey)}
      backHref={`/e/${slug}/${event}`}
      /* R14.3. A member signed in to their own church does not type their own
         name in: the church already holds it. Null for anybody else. */
      me={await knownRegistrant(slug)}
    />
  );
}

import { notFound } from "next/navigation";
import { publicEvent, publicChurchTimezone } from "@hearth/db";
import { supabaseServer } from "@/lib/supabase/server";
import { churchNow } from "@/lib/church-now";
import { RegisterPage } from "@/components/register-page";

export const dynamic = "force-dynamic";

/** R14.2, R14.6. Taking a place, for somebody with no account. */
export default async function PublicRegisterPage({
  params,
}: {
  params: Promise<{ slug: string; event: string }>;
}) {
  const { slug, event } = await params;
  const clock = churchNow(await publicChurchTimezone(slug));

  const found = await publicEvent(slug, event, clock.date, clock.time);
  if (!found) notFound();

  let logoUrl: string | null = null;
  if (found.church.logoKey) {
    const supabase = await supabaseServer();
    const signed = await supabase.storage
      .from("church")
      .createSignedUrl(found.church.logoKey, 3600);
    logoUrl = signed.data?.signedUrl ?? null;
  }

  return (
    <RegisterPage
      event={found}
      logoUrl={logoUrl}
      churchSlug={slug}
      eventSlug={event}
      today={clock.date}
      backHref={`/e/${slug}/${event}`}
    />
  );
}

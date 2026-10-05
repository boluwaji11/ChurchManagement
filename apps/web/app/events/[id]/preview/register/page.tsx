import { notFound, redirect } from "next/navigation";
import {
  withTenant, getChurch, getEvent, getForm, canManageEvents,
  type PublicEvent,
} from "@hearth/db";
import { t } from "@hearth/i18n";
import { requireSession } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";
import { EventRegisterPage } from "@/components/event-register-page";
import { churchNow } from "@/lib/church-now";

export const dynamic = "force-dynamic";

/**
 * R14.2, R14.6. The registration page, before anybody else can see it.
 *
 * Drawn from the church's own session so a draft can be walked through, and
 * refusing to send, so looking at it takes no places.
 */
export default async function PreviewRegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ church?: string }>;
}) {
  const { id } = await params;
  const { church } = await searchParams;
  const session = await requireSession(church);
  if (!canManageEvents(session)) redirect(`/?church=${session.tenantSlug}`);

  const ctx = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };

  const result = await withTenant(ctx, async (tx) => {
    const found = await getEvent(tx, id);
    if (!found) return null;
    return {
      event: found,
      form: found.formId ? await getForm(tx, found.formId) : null,
      profile: await getChurch(tx, session.tenantId),
    };
  });
  if (!result) notFound();

  const { event, form, profile } = result;

  const supabase = await supabaseServer();
  const sign = async (key: string | null) => {
    if (!key) return null;
    const signed = await supabase.storage.from("church").createSignedUrl(key, 3600);
    return signed.data?.signedUrl ?? null;
  };

  /*
   * Shaped as the public page shapes it, with one difference: an event that
   * takes registrations previews as open whatever its own state is, because a
   * preview exists to show the page rather than to take a place, and a draft
   * would otherwise preview as closed. An event that asks for no registration
   * previews without the button, which is what the page will carry.
   */
  const shown: PublicEvent = {
    church: {
      slug: session.tenantSlug,
      name: profile?.name ?? session.tenantName,
      brandHue: profile?.brandHue ?? "indigo",
      phone: profile?.phone ?? null,
      website: profile?.website ?? null,
      logoKey: profile?.logoKey ?? null,
    },
    id: event.id,
    name: event.name,
    description: event.description,
    hue: event.hue,
    coverKey: event.coverKey,
    startsOn: event.startsOn,
    startsAt: event.startsAt,
    endsOn: event.endsOn,
    endsAt: event.endsAt,
    location: event.location,
    addressLine1: event.addressLine1,
    addressLine2: event.addressLine2,
    city: event.city,
    region: event.region,
    postalCode: event.postalCode,
    country: event.country,
    capacity: event.capacity,
    showCapacity: event.showCapacity,
    going: event.going,
    state: "open",
    formSlug: form?.slug ?? null,
    questions: form?.fields ?? [],
  };

  const clock = churchNow(profile?.timezone ?? "America/Chicago");

  return (
    <EventRegisterPage
      event={shown}
      churchSlug={session.tenantSlug}
      eventSlug={event.slug}
      today={clock.date}
      coverUrl={await sign(event.coverKey)}
      logoUrl={await sign(profile?.logoKey ?? null)}
      backHref={`/events/${event.slug}/preview?church=${session.tenantSlug}`}
      preview
      banner={
        <div
          className="px-4 py-2 text-center text-caption font-medium"
          style={{ background: "var(--hue-amber-tint)", color: "var(--hue-amber-key)" }}
        >
          {t("event.previewing")}
        </div>
      }
    />
  );
}

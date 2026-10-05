import { notFound, redirect } from "next/navigation";
import { withTenant, getChurch, getEvent, getForm, canManageEvents, type PublicEvent } from "@hearth/db";
import { t } from "@hearth/i18n";
import { requireSession } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";
import { churchNow } from "@/lib/church-now";
import { RegisterPage } from "@/components/register-page";

export const dynamic = "force-dynamic";

/**
 * R14.2. The registration page, before anybody else can reach it.
 *
 * The same component the congregation gets, from the church's own session, so a
 * draft can be looked at end to end. It refuses to send.
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

  const result = await withTenant(
    {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      permissions: session.permissions,
    },
    async (tx) => {
      const found = await getEvent(tx, id);
      if (!found) return null;
      return {
        event: found,
        form: found.formId ? await getForm(tx, found.formId) : null,
        profile: await getChurch(tx, session.tenantId),
      };
    },
  );
  if (!result) notFound();

  const { event, form, profile } = result;

  let logoUrl: string | null = null;
  if (profile?.logoKey) {
    const supabase = await supabaseServer();
    const signed = await supabase.storage.from("church").createSignedUrl(profile.logoKey, 3600);
    logoUrl = signed.data?.signedUrl ?? null;
  }

  const shown = {
    church: {
      slug: session.tenantSlug,
      name: profile?.name ?? session.tenantName,
      brandHue: profile?.brandHue ?? "indigo",
      phone: null,
      website: null,
      logoKey: profile?.logoKey ?? null,
    },
    ...event,
    // Open whatever the event's own state is, because a preview exists to show
    // the page rather than to take a place.
    state: "open" as const,
    showCapacity: event.showCapacity,
    questions: form?.fields ?? [],
  } as unknown as PublicEvent;

  return (
    <RegisterPage
      event={shown}
      logoUrl={logoUrl}
      churchSlug={session.tenantSlug}
      eventSlug={event.slug}
      today={churchNow(profile?.timezone ?? "America/Chicago").date}
      backHref={`/events/${event.id}/preview?church=${session.tenantSlug}`}
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

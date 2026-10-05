import { notFound, redirect } from "next/navigation";
import {
  withTenant, getChurch, groupPage, canManageGroups,
  type PublicGroup, type PublicChurch,
} from "@hearth/db";
import { t } from "@hearth/i18n";
import { requireSession } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";
import { oneLineAddress, mappable, toAddress } from "@/lib/address";
import { GroupPublicPage } from "@/components/group-public-page";

export const dynamic = "force-dynamic";

/**
 * R9.5. The public page, before anybody else can see it.
 *
 * Read through the tenant context rather than the public query, which is what
 * lets a draft be looked at without opening drafts to the open web.
 */
export default async function PreviewGroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ church?: string }>;
}) {
  const { id } = await params;
  const { church } = await searchParams;
  const session = await requireSession(church);
  if (!canManageGroups(session)) redirect(`/?church=${session.tenantSlug}`);

  const ctx = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };

  const result = await withTenant(ctx, async (tx) => {
    const found = await groupPage(tx, id, { manage: true });
    if (!found) return null;
    return { group: found, profile: await getChurch(tx, session.tenantId) };
  });
  if (!result) notFound();

  const { group, profile } = result;

  const supabase = await supabaseServer();
  const sign = async (key: string | null) => {
    if (!key) return null;
    const signed = await supabase.storage.from("church").createSignedUrl(key, 3600);
    return signed.data?.signedUrl ?? null;
  };

  const place = toAddress({
    line1: group.addressLine1,
    line2: group.addressLine2,
    city: group.city,
    region: group.region,
    postalCode: group.postalCode,
    country: group.country,
  });

  const shownChurch: PublicChurch = {
    slug: session.tenantSlug,
    name: profile?.name ?? session.tenantName,
    brandHue: profile?.brandHue ?? "indigo",
    phone: profile?.phone ?? null,
    website: profile?.website ?? null,
    logoKey: profile?.logoKey ?? null,
  };

  // Shaped as the public query shapes it, so what is previewed and what is
  // published are the same page drawn from the same fields.
  const shown: PublicGroup = {
    id: group.id,
    slug: group.slug,
    name: group.name,
    description: group.description,
    typeName: group.typeName,
    typeHue: group.typeHue,
    dayOfWeek: group.dayOfWeek,
    startsAt: group.startsAt,
    endsAt: group.endsAt,
    frequency: group.frequency,
    location: group.location,
    address: oneLineAddress(place) || null,
    mappable: mappable(place),
    forWhom: group.forWhom,
    online: group.online,
    childrenWelcome: group.childrenWelcome,
    memberCount: group.memberCount,
    full: group.full,
    openToJoin: group.openToJoin,
    photoKey: group.photoKey,
  };

  return (
    <GroupPublicPage
      church={shownChurch}
      group={shown}
      photoUrl={await sign(group.photoKey)}
      logoUrl={await sign(profile?.logoKey ?? null)}
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

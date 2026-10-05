import {
  withTenant, findGroups, listGroupTypes, pendingRequests, personForUser, canManageGroups,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { Finder } from "./finder";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * R9.1 to R9.6. The one groups screen.
 *
 * A member comes here asking "is there something for me on a Tuesday", and
 * whoever runs groups comes here to write one down. That is the same list, so
 * it is the same screen: the manage side adds the unlisted groups, the archived
 * ones, and the button that creates one.
 */
export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);
  const actor = { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions };
  const manage = canManageGroups(session);

  const { groups, types, requests } = await withTenant(actor, async (tx) => {
    const self = await personForUser(tx, session.userId);
    return {
      groups: await findGroups(tx, { memberId: self, manage }),
      types: await listGroupTypes(tx),
      requests: await pendingRequests(tx, actor),
    };
  });

  /*
   * R9.2. The bucket is private, so each picture is served through a link
   * signed for an hour. Signed here rather than in the card, because a client
   * component cannot hold the key and one pass is one round trip.
   */
  const photos = new Map<string, string>();
  const withPhotos = groups.filter((group) => group.photoKey);
  if (withPhotos.length > 0) {
    const supabase = await supabaseServer();
    for (const group of withPhotos) {
      const signed = await supabase.storage
        .from("church")
        .createSignedUrl(group.photoKey!, 3600);
      if (signed.data?.signedUrl) photos.set(group.id, signed.data.signedUrl);
    }
  }

  return (
    <AppShell
      session={session}
      title={t("groups.title")}
    >
      <Finder
        church={session.tenantSlug}
        canManage={manage}
        types={types.map((type) => ({
          id: type.id,
          name: type.name,
          description: type.description,
          hue: type.hue,
        }))}
        requests={requests.map((request) => ({
          id: request.id,
          groupId: request.groupId,
          groupSlug: request.groupSlug,
          groupName: request.groupName,
          personName: request.personName,
          message: request.message,
        }))}
        groups={groups.map((group) => ({
          id: group.id,
          slug: group.slug,
          status: group.status,
          createdAt: group.createdAt.toISOString(),
          name: group.name,
          description: group.description,
          typeId: group.typeId,
          typeName: group.typeName,
          typeHue: group.typeHue,
          dayOfWeek: group.dayOfWeek,
          startsAt: group.startsAt,
          endsAt: group.endsAt,
          frequency: group.frequency,
          location: group.location,
          forWhom: group.forWhom,
          online: group.online,
          childrenWelcome: group.childrenWelcome,
          memberCount: group.memberCount,
          leaderNames: group.leaderNames,
          openToJoin: group.openToJoin,
          full: group.full,
          mine: group.mine,
          requested: group.requested,
          listed: group.listed,
          archived: group.archived,
          photoUrl: photos.get(group.id) ?? null,
        }))}
      />
    </AppShell>
  );
}

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  withTenant, findGroups, listGroupTypes, pendingRequests, personForUser, canManageGroups,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
import { PortalShell, PortalTitle } from "@/components/portal-shell";
import { readsAsMember } from "@/lib/reads-as-member";
import { TypesLanding, type TypeCard } from "./types-landing";
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
  searchParams: Promise<{ church?: string; type?: string }>;
}) {
  const { church, type } = await searchParams;
  const session = await requireSession(church);
  const actor = { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions };
  const manage = canManageGroups(session);
  // R17.5. A member reads this screen in the portal's frame. Staff read the
  // same list inside the app.
  const portal = readsAsMember(session);

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

  /*
   * R9.5. The kinds of group lead, and a kind is what opens a list. A church
   * with sixty groups has three or four things it calls by name, and somebody
   * arriving is choosing between those rather than scrolling sixty rows.
   */
  const kinds: TypeCard[] = types.map((one) => {
    const of = groups.filter((group) => group.typeId === one.id);
    return {
      id: one.id,
      name: one.name,
      description: one.description,
      hue: one.hue,
      all: of.length,
    };
  }).filter((one) => one.all > 0 || manage);

  if (!type && kinds.length > 1) {
    const landing = <TypesLanding church={session.tenantSlug} types={kinds} />;
    return portal ? (
      <PortalShell session={session}>
        <PortalTitle title={t("find.title")} under={t("find.lede")} />
        {landing}
      </PortalShell>
    ) : (
      <AppShell session={session} title={t("groups.title")}>{landing}</AppShell>
    );
  }

  const only = type && type !== "all" ? kinds.find((one) => one.id === type) : null;
  const shown = only ? groups.filter((group) => group.typeId === only.id) : groups;

  const finder = (
    <Finder
        church={session.tenantSlug}
        from={type ? `&type=${encodeURIComponent(type)}` : ""}
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
        groups={shown.map((group) => ({
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
          // R3.1. How many are in a group is the church's record, not the finder's.
          memberCount: manage ? group.memberCount : null,
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
  );

  // The way back to the kinds, where a kind is what was opened.
  const back = kinds.length > 1 ? (
    <Link
      href={`/groups?church=${session.tenantSlug}`}
      className="-mb-2 inline-flex items-center gap-1.5 self-start font-medium text-primary"
    >
      <ArrowLeft className="size-4" aria-hidden /> {t("groupType.back")}
    </Link>
  ) : null;

  if (portal) {
    return (
      <PortalShell session={session}>
        {back}
        <PortalTitle
          title={only?.name ?? t("find.title")}
          under={only?.description ?? t("find.lede")}
        />
        {finder}
      </PortalShell>
    );
  }

  return (
    <AppShell session={session} title={only?.name ?? t("groups.title")}>
      {back}
      {finder}
    </AppShell>
  );
}

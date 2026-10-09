import Link from "next/link";
import { Plus } from "lucide-react";
import {
  withTenant, findGroups, countArchivedGroups, listGroupTypes, pendingRequests, personForUser,
  canManageGroups,
} from "@connectapp/db";
import { Button } from "@connectapp/ui";
import { t, plural } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
import { BackLink } from "@/components/back-link";
import { PortalShell, PortalTitle } from "@/components/portal-shell";
import { readsAsMember } from "@/lib/reads-as-member";
import { TypesLanding, type TypeCard } from "./types-landing";
import { Markdown } from "@/components/markdown";
import { requireSession } from "@/lib/session";
import { Finder } from "./finder";
import { supabaseServer } from "@/lib/supabase/server";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  return tabMetadata(t("nav.groups"), church);
}

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
  searchParams: Promise<{ church?: string; type?: string; archived?: string }>;
}) {
  const { church, type, archived } = await searchParams;
  const session = await requireSession(church);
  const actor = { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions };
  const manage = canManageGroups(session);
  // R17.5. A member reads this screen in the portal's frame. Staff read the
  // same list inside the app.
  const portal = readsAsMember(session);

  /* R9.2. A group that has been put away comes off this screen and sits behind
     the one link under it, which is also the way back to bringing it out. */
  const putAway = manage && archived === "1";

  const { groups, types, requests, archivedCount } = await withTenant(actor, async (tx) => {
    const self = await personForUser(tx, session.userId);
    return {
      groups: await findGroups(tx, { memberId: self, manage, archivedOnly: putAway }),
      types: await listGroupTypes(tx),
      requests: await pendingRequests(tx, actor),
      archivedCount: manage ? await countArchivedGroups(tx) : 0,
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
      slug: one.slug,
      name: one.name,
      description: one.description,
      hue: one.hue,
      all: of.length,
    };
  }).filter((one) => one.all > 0 || manage);

  /* R9.2. One link, under whichever list this church reads: the kinds, or the
     groups themselves. */
  const archivedLink = !putAway && manage && archivedCount > 0 ? (
    <Link
      href={`/groups?church=${session.tenantSlug}&archived=1`}
      className="self-start text-label font-medium text-primary underline-offset-4 hover:underline"
    >
      {plural("groups.archived", archivedCount)}
    </Link>
  ) : null;

  /*
   * R9.5. The kinds lead, for everybody. A member arriving at the groups screen
   * and a leader arriving at it are choosing between the same three or four
   * things the church calls by name, so they meet the same screen.
   */
  if (!putAway && !type && kinds.length > 0) {
    const landing = (
      <TypesLanding church={session.tenantSlug} types={kinds} />
    );
    /* The kinds are the heading. A title over a list of names that are
       themselves titles says the word twice. */
    return portal ? (
      <PortalShell session={session} tab={t("nav.groups")}>{landing}</PortalShell>
    ) : (
      <AppShell
        session={session}
        title={t("groups.title")}
        /* Nothing is chosen here, so the press is the plain one. */
        action={
          manage ? (
            <Button asChild>
              <Link href={`/groups/new?church=${session.tenantSlug}`}>
                <Plus /> {t("groups.add")}
              </Link>
            </Button>
          ) : undefined
        }
      >
        {landing}
        {archivedLink}
      </AppShell>
    );
  }

  // Found by its readable name or by its id, so an address somebody saved
  // before a kind had a name in its address goes on working.
  const only = type && type !== "all"
    ? kinds.find((one) => one.slug === type || one.id === type)
    : null;
  const shown = only ? groups.filter((group) => group.typeId === only.id) : groups;

  /*
   * R9.5. The requests waiting are the ones for the groups on this screen.
   *
   * A church reading its Small groups was shown somebody asking to join the
   * Worship Team, which is a different kind and a different list. A leader
   * answers requests for what they are looking at.
   */
  const here = new Set(shown.map((group) => group.id));
  const waiting = requests.filter((request) => here.has(request.groupId));

  /*
   * R9.1. It names the kind it writes one of.
   *
   * A church reading its Small groups and pressing "Create a Group" met a
   * blank form asking what kind it was, having just said. The kind travels
   * with the press, so the form opens on it and the way back out returns to
   * the list it was started from.
   */
  const making = manage && !putAway ? (
    <Button asChild>
      <Link
        /* R9.1. Whichever list this was started from travels with the press:
           a kind, or the one that holds them all. */
        href={`/groups/new?church=${session.tenantSlug}${
          type ? `&type=${only ? (only.slug ?? only.id) : type}` : ""
        }`}
      >
        <Plus /> {only ? t("groups.addOf", { type: only.name }) : t("groups.add")}
      </Link>
    </Button>
  ) : undefined;

  const finder = (
    <Finder
        church={session.tenantSlug}
        from={type ? `&type=${encodeURIComponent(type)}` : ""}
        canManage={manage}
        putAway={putAway}
        make={making}
        types={types.map((type) => ({
          id: type.id,
          name: type.name,
          description: type.description,
          hue: type.hue,
        }))}
        requests={waiting.map((request) => ({
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

  /*
   * R24.6. The screen's one action, in the top bar.
   *
   * It used to sit over the list, which gave the screen two header rows: one
   * with the name of the thing and one with the button that makes another.
   */
  // R9.2. The way back out of the archived view, then the way back to the
  // kinds, which is offered wherever the kinds screen exists.
  /* R24.6. The way back rides the action's own row rather than sitting in a
     band above it. */
  const back = putAway
    ? { href: `/groups?church=${session.tenantSlug}`, label: t("groups.archived.back") }
    : kinds.length > 0
      ? { href: `/groups?church=${session.tenantSlug}`, label: t("groupType.back") }
      : undefined;

  if (portal) {
    return (
      <PortalShell session={session} tab={only?.name ?? t("nav.groups")} action={making}>
        {back ? <BackLink href={back.href} label={back.label} /> : null}
        <PortalTitle
          title={only?.name ?? t("find.title")}
          under={
            only?.description ? (
              /* A size down from body. It is the church's own words about the
                 kind, read once, over a list that is the reason for the page. */
              <Markdown
                text={only.description}
                className="flex max-w-[70ch] flex-col gap-1.5 text-[13px] leading-[20px] text-fg-muted"
              />
            ) : (
              t("find.lede")
            )
          }
        />
        {finder}
      </PortalShell>
    );
  }

  return (
    <AppShell
      session={session}
      title={only?.name ?? t("groups.title")}
      /* R24.17. An empty list offers the press in the middle of the screen,
         where somebody with nothing is looking, so the top of the screen does
         not offer it twice. */
      action={shown.length === 0 ? undefined : making}
      back={back}
    >
      {/* R9.5. The kind's own words head its list here as well. The top bar
          carries the name and nothing else, so without this the church's
          description was readable in the member's portal and nowhere else. */}
      {only?.description ? (
        <Markdown
          text={only.description}
          className="-mt-1 flex max-w-[70ch] flex-col gap-1.5 text-[13px] leading-[20px] text-fg-muted"
        />
      ) : null}

      {finder}

      {archivedLink}
    </AppShell>
  );
}

import Link from "next/link";
import { Plus } from "lucide-react";
import {
  withTenant, findGroups, countArchivedGroups, listGroupTypes, pendingRequests, personForUser,
  canManageGroups,
} from "@connectapp/db";
import { Button } from "@connectapp/ui";
import { t, plural } from "@connectapp/i18n";
import { Screen } from "@/components/screen";
import { PortalTitle } from "@/components/portal-shell";
import { readsAsMember } from "@/lib/reads-as-member";
import { TypesLanding, type TypeCard } from "./types-landing";
import { Markdown } from "@/components/markdown";
import { requireScreen } from "@/lib/shell-data";
import { photoUrls } from "@/lib/photos";
import { Finder } from "./finder";

/**
 * R9.1 to R9.6. The one groups screen.
 *
 * A member comes here asking "is there something for me on a Tuesday", and
 * whoever runs groups comes here to write one down. That is the same list, so
 * it is the same screen: the manage side adds the unlisted groups, the archived
 * ones, and the button that creates one.
 */
export async function GroupsListScreen({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; archived?: string }>;
}) {
  const { type, archived } = await searchParams;
  const session = await requireScreen();
  const actor = { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions };
  const manage = canManageGroups(session);
  // R17.5. A member reads this screen in the portal's frame. Staff read the
  // same list inside the app.
  const portal = readsAsMember(session);

  /* R9.2. A group that has been archived comes off this screen and sits behind
     the one link under it, which is also the way back to bringing it out. */
  const putAway = manage && archived === "1";

  const { groups, types, requests, archivedCount } = await withTenant(actor, async (tx) => {
    const self = await personForUser(tx, session.userId);

    /* Four reads, of which three want nothing from each other and the fourth
       wants only who is reading. They went one round trip at a time. */
    const [groups, types, requests, archivedCount] = await Promise.all([
      findGroups(tx, { memberId: self, manage, archivedOnly: putAway }),
      listGroupTypes(tx),
      pendingRequests(tx, actor),
      manage ? countArchivedGroups(tx) : 0,
    ]);

    return {
      groups,
      types,
      requests,
      archivedCount,
    };
  });

  /*
   * R9.2. The bucket is private, so each picture is served through a link
   * signed for an hour. Signed here rather than in the card, because a client
   * component cannot hold the key.
   *
   * The keys are signed in one batch. This was previously a loop calling
   * storage once per group, so a church with sixty groups made sixty sequential
   * calls on the screen a visitor reaches from its website. `photoUrls` signs
   * them together and caches the result.
   */
  const withPhotos = groups.filter((group) => group.photoKey);
  const signed = await photoUrls(withPhotos.map((group) => group.photoKey));
  const photos = new Map<string, string>(
    withPhotos
      .map((group) => [group.id, signed[group.photoKey!]] as const)
      .filter((pair): pair is readonly [string, string] => Boolean(pair[1])),
  );

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
      href={"/groups?archived=1"}
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
      <TypesLanding types={kinds} />
    );
    /* The kinds are the heading. A title over a list of names that are
       themselves titles says the word twice. */
    return portal ? (
      <Screen>{landing}</Screen>
    ) : (
      <Screen
        /* Nothing is chosen here, so the press is the plain one. */
        action={
          manage ? (
            <Button asChild>
              <Link href={"/groups/new"}>
                <Plus /> {t("groups.add")}
              </Link>
            </Button>
          ) : undefined
        }
      >
        {landing}
        {archivedLink}
      </Screen>
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
        href={`/groups/new${
          type ? `?type=${only ? (only.slug ?? only.id) : type}` : ""
        }`}
      >
        <Plus /> {only ? t("groups.addOf", { type: only.name }) : t("groups.add")}
      </Link>
    </Button>
  ) : undefined;

  const finder = (
    <Finder
        from={type ? `?type=${encodeURIComponent(type)}` : ""}
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
   * R24.6. The screen's one action, on the row its name is on.
   *
   * It used to sit over the list, which gave the screen two header rows: one
   * with the name of the thing and one with the button that makes another.
   */
  // R9.2. The way back out of the archived view, then the way back to the
  // kinds, which is offered wherever the kinds screen exists.
  /* R24.6. The way back rides the action's own row rather than sitting in a
     band above it. */
  const back = putAway
    ? { href: "/groups", label: t("groups.archived.back") }
    : kinds.length > 0
      ? { href: "/groups", label: t("groupType.back") }
      : undefined;

  if (portal) {
    return (
      <Screen back={back}>
        <PortalTitle
          title={only?.name ?? t("find.title")}
          action={making}
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
      </Screen>
    );
  }

  return (
    <Screen
      title={only?.name}
      /* R24.17. An empty list offers the press in the middle of the screen,
         where somebody with nothing is looking, so the top of the screen does
         not offer it twice. */
      action={shown.length === 0 ? undefined : making}
      back={back}
    >
      {/* R9.5. The kind's own words head its list here as well, so the
          church's description is not readable in the member's portal and
          nowhere else. */}
      {only?.description ? (
        <Markdown
          text={only.description}
          className="-mt-1 flex max-w-[70ch] flex-col gap-1.5 text-[13px] leading-[20px] text-fg-muted"
        />
      ) : null}

      {finder}

      {archivedLink}
    </Screen>
  );
}

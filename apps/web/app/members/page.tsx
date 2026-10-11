import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  withTenant, listPeople, countPeople, listTagsWithCounts, findDuplicateClusters,
  canEditPeople, canArchivePeople, canReadIncidents,
  listSavedLists, countArchivedSavedLists, resolveList, listGroups,
  PER_PAGE,
} from "@connectapp/db";
import { t, plural } from "@connectapp/i18n";
import { Flash } from "@/components/said";
import { requireSession } from "@/lib/session";
import { Denied } from "@/components/denied";
import { AppShell } from "@/components/app-shell";
import { Directory } from "./directory";
import { ArchivedLists } from "./archived-lists";
import { photoUrls } from "@/lib/photos";
import {
  queryFromParams, pageFromParams, paramsFromRule, type DirectoryParams,
} from "@/lib/directory-query";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ }>;
}) {
  const {} = await searchParams;
  return tabMetadata(t("members.title"));
}

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<DirectoryParams>;
}) {
  const params = await searchParams;
  const session = await requireSession();

  const page = pageFromParams(params);

  /* R2.4, R1.14. Two things on this screen can be put away: a person, and a
     saved list. Each has its own view of the same screen rather than a second
     section under the directory. */
  const putAway = params.show === "archived";
  const putAwayLists = params.lists === "archived";

  /*
   * R3.1. A member on this screen sees themselves and a banner about notes they
   * cannot read. The directory their church publishes is the one that holds
   * anybody for them, so that is where they go.
   */
  if (!canEditPeople(session) && !canReadIncidents(session)) {
    return (
      <Denied role={session.role} action="readPeople" church={session.tenantSlug} />
      
    );
  }

  const viewer = { role: session.role, userId: session.userId };

  if (putAwayLists && canEditPeople(session)) {
    const lists = await withTenant(
      { tenantId: session.tenantId, role: session.role },
      (tx) => listSavedLists(tx, { archivedOnly: true }),
    );

    return (
      <AppShell session={session} title={t("members.title")}>
        <Link
          href={"/members"}
          className="inline-flex items-center gap-1.5 self-start font-medium text-primary"
        >
          <ArrowLeft className="size-4" /> {t("lists.archived.back")}
        </Link>

        <ArchivedLists
          lists={lists.map((one) => ({ id: one.id, name: one.name, kind: one.kind }))}
        />
      </AppShell>
    );
  }

  const {
    members, tags, groups, duplicates, matching, lists, viewing,
    archivedLists,
  } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      // R1.14. A saved list is either a set of members or the filters it was
      // saved with. A rule list is read as though somebody had typed them.
      const opened = params.list ? await resolveList(tx, params.list) : null;
      const query = opened?.kind === "rule"
        ? queryFromParams(paramsFromRule(opened.rule ?? {}))
        : queryFromParams(params);
      if (opened?.kind === "static") query.ids = opened.ids ?? [];

      /*
       * Six reads that have nothing to say to each other go down the one
       * connection together. Waiting on each one in turn spent a round trip
       * apiece, and the round trip is the expensive part.
       */
      const [
        lists, members, matching, tags, groups, clusters, archivedLists,
      ] = await Promise.all([
        canEditPeople(session) ? listSavedLists(tx) : [],
        // R9.3. Who is asking goes to the query layer, which decides what they
        // may see. A group leader gets their own group and nobody else.
        listPeople(tx, { ...query, viewer, page, perPage: PER_PAGE }),
        countPeople(tx, { ...query, viewer }),
        listTagsWithCounts(tx),
        listGroups(tx),
        canArchivePeople(session) ? findDuplicateClusters(tx) : [],
        canEditPeople(session) ? countArchivedSavedLists(tx) : 0,
      ]);

      return {
        lists,
        viewing: opened ? { id: params.list!, name: opened.name, kind: opened.kind } : null,
        members,
        matching,
        tags,
        groups,
        duplicates: clusters.length,
        archivedLists,
      };
    },
  );

  const canEdit = canEditPeople(session);
  const canArchive = canArchivePeople(session);
  // R2.9. Every face on the list, signed in one round trip.
  const faces = await photoUrls(members.map((one) => one.photoKey));

  return (
    <AppShell
      session={session}
      title={t("members.title")}
      /* The action rides the end of the directory's own toolbar, at the far
         right, and an empty directory offers it in the middle of the screen
         instead. */
    >
      {/* R22.1. Above everything, because it is about the church rather than
          about this screen. */}

      {params.archived ? (
        <Flash message={t("person.archived.title")} />
      ) : null}

      <Directory
        church={session.tenantSlug}
        putAway={putAway}
        canEdit={canEdit}
        canArchive={canArchive}
        page={page}
        perPage={PER_PAGE}
        matching={matching}
        duplicates={duplicates}
        lists={lists}
        viewing={viewing}
        tags={tags.map((x) => ({ id: x.id, slug: x.slug, name: x.name, hue: x.hue }))}
        groups={groups.map((g) => ({ id: g.id, name: g.name, hue: g.typeHue }))}
        rows={members.map((p) => ({
          id: p.id,
          photoUrl: p.photoKey ? (faces[p.photoKey] ?? null) : null,
          slug: p.slug,
          displayName: p.displayName,
          lifecycleStatus: p.lifecycleStatus,
          householdName: p.householdName,
          primaryEmail: p.primaryEmail,
          primaryPhone: p.primaryPhone,
          tagNames: p.tagNames,
          archived: Boolean(p.archivedAt),
        }))}
      />

      {/* R1.14. A saved list could be put away and then reached by nothing. */}
      {!putAway && canEdit && archivedLists > 0 ? (
        <Link
          href={"/members?lists=archived"}
          className="self-start text-label font-medium text-primary underline-offset-4 hover:underline"
        >
          {plural("lists.archived", archivedLists)}
        </Link>
      ) : null}
    </AppShell>
  );
}

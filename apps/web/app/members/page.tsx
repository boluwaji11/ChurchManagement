import {
  withTenant, listPeople, countPeople, listTagsWithCounts, findDuplicatePairs,
  canEditPeople, canArchivePeople, canReadIncidents,
  listSavedLists, resolveList, countPeopleByStatus, listGroups, PER_PAGE,
} from "@connectapp/db";
import { Banner } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Flash } from "@/components/said";
import { requireSession } from "@/lib/session";
import { Denied } from "@/components/denied";
import { AppShell } from "@/components/app-shell";
import { Directory } from "./directory";
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
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  return tabMetadata(t("members.title"), church);
}

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<DirectoryParams>;
}) {
  const params = await searchParams;
  const session = await requireSession(params.church);

  const page = pageFromParams(params);

  /*
   * R3.1. A member on this screen sees themselves and a banner about notes they
   * cannot read. The directory their church publishes is the one that holds
   * anybody for them, so that is where they go.
   */
  if (!canEditPeople(session) && !canReadIncidents(session)) {
    return (
      <AppShell session={session} title={t("members.title")}>
        <Denied role={session.role} action="readPeople" church={session.tenantSlug} />
      </AppShell>
    );
  }

  const viewer = { role: session.role, userId: session.userId };

  const { members, tags, groups, counts, duplicates, matching, lists, viewing } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      // R1.14. A saved list is either a set of members or the filters it was
      // saved with. A rule list is read as though somebody had typed them.
      const opened = params.list ? await resolveList(tx, params.list) : null;
      const query = opened?.kind === "rule"
        ? queryFromParams({ ...paramsFromRule(opened.rule ?? {}), church: params.church })
        : queryFromParams(params);
      if (opened?.kind === "static") query.ids = opened.ids ?? [];

      /*
       * Six reads that have nothing to say to each other go down the one
       * connection together. Waiting on each one in turn spent a round trip
       * apiece, and the round trip is the expensive part.
       */
      const [lists, members, matching, tags, groups, counts, pairs] = await Promise.all([
        canEditPeople(session) ? listSavedLists(tx) : [],
        // R9.3. Who is asking goes to the query layer, which decides what they
        // may see. A group leader gets their own group and nobody else.
        listPeople(tx, { ...query, viewer, page, perPage: PER_PAGE }),
        countPeople(tx, { ...query, viewer }),
        listTagsWithCounts(tx),
        listGroups(tx),
        // R2.14. The numbers beside each status in the filter drawer.
        countPeopleByStatus(tx),
        canArchivePeople(session) ? findDuplicatePairs(tx) : [],
      ]);

      return {
        lists,
        viewing: opened ? { id: params.list!, name: opened.name, kind: opened.kind } : null,
        members,
        matching,
        tags,
        groups,
        counts,
        duplicates: pairs.length,
      };
    },
  );

  const canEdit = canEditPeople(session);
  // R2.9. Every face on the list, signed in one round trip.
  const faces = await photoUrls(members.map((one) => one.photoKey));

  return (
    <AppShell
      session={session}
      title={t("members.title")}
      /* The action rides the directory's own toolbar, beside the search, and
         an empty directory offers it in the middle of the screen instead. */
    >
      {/* R22.1. Above everything, because it is about the church rather than
          about this screen. */}

      {params.archived ? (
        <Flash message={t("person.archived.title")} />
      ) : null}

      {session.role === "staff" || session.role === "member" ? (
        <Banner tone="info" title={t("members.restricted.title")} className="mb-8" />
      ) : null}

      <Directory
        church={session.tenantSlug}
        canEdit={canEdit}
        canArchive={canArchivePeople(session)}
        page={page}
        perPage={PER_PAGE}
        matching={matching}
        counts={counts}
        duplicates={duplicates}
        lists={lists}
        viewing={viewing}
        tags={tags.map((x) => ({ id: x.id, name: x.name, hue: x.hue }))}
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
    </AppShell>
  );
}

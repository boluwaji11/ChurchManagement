import { redirect } from "next/navigation";
import {
  withTenant, listPeople, countPeople, listTagsWithCounts, findDuplicatePairs,
  canEditPeople, canArchivePeople, canReadIncidents, canManageChurch, setupProgress,
  listSavedLists, resolveList, countPeopleByStatus, listGroups, PER_PAGE,
} from "@connectapp/db";
import { Banner } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { Directory } from "./directory";
import { SetupBanner } from "../setup/banner";
import {
  queryFromParams, pageFromParams, paramsFromRule, type DirectoryParams,
} from "@/lib/directory-query";

export const dynamic = "force-dynamic";

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
    redirect(`/home?church=${session.tenantSlug}`);
  }

  const viewer = { role: session.role, userId: session.userId };

  const { members, tags, groups, counts, duplicates, matching, setup, lists, viewing } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      // R1.14. A saved list is either a set of members or the filters it was
      // saved with. A rule list is read as though somebody had typed them.
      const opened = params.list ? await resolveList(tx, params.list) : null;
      const query = opened?.kind === "rule"
        ? queryFromParams({ ...paramsFromRule(opened.rule ?? {}), church: params.church })
        : queryFromParams(params);
      if (opened?.kind === "static") query.ids = opened.ids ?? [];

      return {
        lists: canEditPeople(session) ? await listSavedLists(tx) : [],
        viewing: opened ? { id: params.list!, name: opened.name, kind: opened.kind } : null,
        // R9.3. Who is asking goes to the query layer, which decides what they
        // may see. A group leader gets their own group and nobody else.
        members: await listPeople(tx, { ...query, viewer, page, perPage: PER_PAGE }),
        matching: await countPeople(tx, { ...query, viewer }),
        tags: await listTagsWithCounts(tx),
        groups: await listGroups(tx),
        // R2.14. The numbers beside each status in the filter drawer.
        counts: await countPeopleByStatus(tx),
        duplicates: canArchivePeople(session) ? (await findDuplicatePairs(tx)).length : 0,
        // R22.1. Until the church is set up, this is the first thing on the
        // screen somebody lands on.
        setup: canManageChurch(session)
          ? await setupProgress(tx, session.tenantId)
          : null,
      };
    },
  );

  const canEdit = canEditPeople(session);

  return (
    <AppShell
      session={session}
      title={t("members.title")}
      /* The action rides the directory's own toolbar, beside the search, and
         an empty directory offers it in the middle of the screen instead. */
    >
      {/* R22.1. Above everything, because it is about the church rather than
          about this screen. */}
      {setup && !setup.complete && !setup.dismissed ? (
        <SetupBanner church={session.tenantSlug} />
      ) : null}

      {params.archived ? (
        <Banner tone="success" title={t("person.archived.title")} className="mb-8" />
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

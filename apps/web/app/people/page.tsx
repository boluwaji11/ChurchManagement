import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Upload, Printer, Cake } from "lucide-react";
import {
  withTenant, listPeople, countPeople, listTagsWithCounts, findDuplicatePairs,
  canEditPeople, canArchivePeople, canReadIncidents, canManageChurch, setupProgress,
  listSavedLists, resolveList, PER_PAGE,
} from "@hearth/db";
import { Button, Banner } from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
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
  if (!canEditPeople(session.role) && !canReadIncidents(session.role)) {
    redirect(`/home?church=${session.tenantSlug}`);
  }

  const viewer = { role: session.role, userId: session.userId };

  const { people, tags, duplicates, matching, setup, lists, viewing } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      // R1.14. A saved list is either a set of people or the filters it was
      // saved with. A rule list is read as though somebody had typed them.
      const opened = params.list ? await resolveList(tx, params.list) : null;
      const query = opened?.kind === "rule"
        ? queryFromParams({ ...paramsFromRule(opened.rule ?? {}), church: params.church })
        : queryFromParams(params);
      if (opened?.kind === "static") query.ids = opened.ids ?? [];

      return {
        lists: canEditPeople(session.role) ? await listSavedLists(tx) : [],
        viewing: opened ? { id: params.list!, name: opened.name, kind: opened.kind } : null,
        // R9.3. Who is asking goes to the query layer, which decides what they
        // may see. A group leader gets their own group and nobody else.
        people: await listPeople(tx, { ...query, viewer, page, perPage: PER_PAGE }),
        matching: await countPeople(tx, { ...query, viewer }),
        tags: await listTagsWithCounts(tx),
        duplicates: canArchivePeople(session.role) ? (await findDuplicatePairs(tx)).length : 0,
        // R22.1. Until the church is set up, this is the first thing on the
        // screen somebody lands on.
        setup: canManageChurch(session.role)
          ? await setupProgress(tx, session.tenantId)
          : null,
      };
    },
  );

  const canEdit = canEditPeople(session.role);

  return (
    <AppShell
      session={session}
      title={t("people.title")}
      action={
        canEdit ? (
          <Button asChild>
            <Link href={`/people/new?church=${session.tenantSlug}`}>
              <Plus /> {t("people.add")}
            </Link>
          </Button>
        ) : undefined
      }
    >
      {/* R22.1. Above everything, because it is about the church rather than
          about this screen. */}
      {setup && !setup.complete && !setup.dismissed ? (
        <SetupBanner church={session.tenantSlug} />
      ) : null}

      {canEdit ? (
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <Button variant="secondary" asChild>
            <Link href={`/import?church=${session.tenantSlug}`}>
              <Upload /> {t("import.title")}
            </Link>
          </Button>
          {/* R2.11. Who to send a card to, by month or by week. */}
          <Button variant="secondary" asChild>
            <Link href={`/people/celebrations?church=${session.tenantSlug}`}>
              <Cake /> {t("celebrations.open")}
            </Link>
          </Button>
          {/* R3.5. The one directory of the congregation we produce, and the
              church hands it out rather than anybody searching it. */}
          <Button variant="secondary" asChild>
            <Link href={`/people/print?church=${session.tenantSlug}`} target="_blank">
              <Printer /> {t("printDirectory.print")}
            </Link>
          </Button>
        </div>
      ) : null}

      {duplicates > 0 ? (
        <Banner tone="warning" title={t("merge.title")} className="mb-8">
          <Link href={`/duplicates?church=${session.tenantSlug}`} className="underline hover:text-fg">
            {plural("merge.pending", duplicates)}
          </Link>
        </Banner>
      ) : null}

      {params.archived ? (
        <Banner tone="success" title={t("person.archived.title")} className="mb-8" />
      ) : null}

      {params.welcome ? (
        <Banner
          tone="success"
          title={t("createChurch.welcome.title", { church: session.tenantName })}
          className="mb-8"
        >
          {t("createChurch.welcome.body")}
        </Banner>
      ) : null}

      {session.role === "staff" || session.role === "member" ? (
        <Banner tone="info" title={t("people.restricted.title")} className="mb-8" />
      ) : null}

      <Directory
        church={session.tenantSlug}
        canEdit={canEdit}
        canArchive={canArchivePeople(session.role)}
        page={page}
        perPage={PER_PAGE}
        matching={matching}
        lists={lists}
        viewing={viewing}
        tags={tags.map((x) => ({ id: x.id, name: x.name, hue: x.hue }))}
        rows={people.map((p) => ({
          id: p.id,
          displayName: p.displayName,
          lifecycleStatus: p.lifecycleStatus,
          householdName: p.householdName,
          primaryEmail: p.primaryEmail,
          primaryPhone: p.primaryPhone,
          archived: Boolean(p.archivedAt),
        }))}
      />
    </AppShell>
  );
}

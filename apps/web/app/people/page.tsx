import Link from "next/link";
import { Plus, Download } from "lucide-react";
import {
  withTenant, listPeople, countPeople, listTagsWithCounts, findDuplicatePairs,
  canEditPeople, canArchivePeople, PER_PAGE,
} from "@hearth/db";
import { Button, Banner } from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import { PageTitle } from "@/components/section";
import { requireSession } from "@/lib/session";
import { AppHeader } from "@/components/app-header";
import { Directory } from "./directory";
import { queryFromParams, pageFromParams, type DirectoryParams } from "@/lib/directory-query";

export const dynamic = "force-dynamic";

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<DirectoryParams>;
}) {
  const params = await searchParams;
  const session = await requireSession(params.church);

  const query = queryFromParams(params);
  const page = pageFromParams(params);

  const { people, tags, duplicates, matching } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      return {
        people: await listPeople(tx, { ...query, page, perPage: PER_PAGE }),
        matching: await countPeople(tx, query),
        tags: await listTagsWithCounts(tx),
        duplicates: canArchivePeople(session.role) ? (await findDuplicatePairs(tx)).length : 0,
      };
    },
  );

  const canEdit = canEditPeople(session.role);

  return (
    <>
      <AppHeader session={session} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <PageTitle title={t("people.title")} className="mb-0" />
          {canEdit ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild>
                <Link href={`/people/new?church=${session.tenantSlug}`}>
                  <Plus /> {t("people.add")}
                </Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link href={`/import?church=${session.tenantSlug}`}>
                  <Download /> {t("import.title")}
                </Link>
              </Button>
            </div>
          ) : null}
        </div>


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
      </main>
    </>
  );
}

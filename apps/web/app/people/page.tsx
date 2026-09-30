import Link from "next/link";
import { Users, UserPlus, HeartHandshake, Plus, Download } from "lucide-react";
import {
  withTenant, listPeople, countPeople, countPeopleByStatus, listTagsWithCounts, findDuplicatePairs,
  canEditPeople, canArchivePeople, PER_PAGE,
} from "@hearth/db";
import { StatTile, Button, Banner } from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import { PageTitle, Section } from "@/components/section";
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

  const { people, counts, tags, total, duplicates, matching } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      return {
        people: await listPeople(tx, { ...query, page, perPage: PER_PAGE }),
        matching: await countPeople(tx, query),
        counts: await countPeopleByStatus(tx),
        tags: await listTagsWithCounts(tx),
        total: (await listPeople(tx)).length,
        duplicates: canArchivePeople(session.role) ? (await findDuplicatePairs(tx)).length : 0,
      };
    },
  );

  const members = counts["member"] ?? 0;
  const visitors = counts["visitor"] ?? 0;
  const canEdit = canEditPeople(session.role);

  return (
    <>
      <AppHeader session={session} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <PageTitle title={t("people.title")} lede={session.tenantName} className="mb-0" />
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

        <Section title={t("people.glance")}>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile label={t("people.stat.people")} value={String(total)} hue="indigo" icon={<Users className="size-4" />} />
            <StatTile label={t("people.stat.members")} value={String(members)} hue="fern" icon={<HeartHandshake className="size-4" />} />
            <StatTile label={t("people.stat.visitors")} value={String(visitors)} hue="amber" icon={<UserPlus className="size-4" />} />
          </div>
        </Section>

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

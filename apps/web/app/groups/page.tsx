import {
  withTenant, listGroups, listGroupTypes, groupRoster, canManageGroups,
} from "@hearth/db";
import { Banner, Button } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { PageTitle } from "@/components/section";
import { AppHeader } from "@/components/app-header";
import { requireSession } from "@/lib/session";
import { GroupList } from "./group-list";

export const dynamic = "force-dynamic";

/**
 * R9.1 to R9.4. Where the church happens between Sundays.
 */
export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  const { groups, types, rosters } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      const all = await listGroups(tx, { includeArchived: true });
      const rosters: Record<string, Awaited<ReturnType<typeof groupRoster>>> = {};
      for (const group of all) rosters[group.id] = await groupRoster(tx, group.id);
      return { groups: all, types: await listGroupTypes(tx), rosters };
    },
  );

  return (
    <>
      <AppHeader session={session} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <PageTitle title={t("groups.title")} className="mb-0" />
          <Button asChild variant="secondary">
            <a href={`/groups/find?church=${session.tenantSlug}`}>{t("find.title")}</a>
          </Button>
        </div>

        {canManageGroups(session.role) ? (
          <GroupList
            church={session.tenantSlug}
            types={types.map((type) => ({ id: type.id, name: type.name, hue: type.hue }))}
            groups={groups.map((group) => ({
              id: group.id,
              name: group.name,
              description: group.description,
              typeId: group.typeId,
              typeName: group.typeName,
              typeHue: group.typeHue,
              dayOfWeek: group.dayOfWeek,
              startsAt: group.startsAt,
              frequency: group.frequency,
              location: group.location,
              capacity: group.capacity,
              openToJoin: group.openToJoin,
              listed: group.listed,
              memberCount: group.memberCount,
              leaders: group.leaders,
              archived: group.archivedAt !== null,
              roster: (rosters[group.id] ?? []).map((m) => ({
                personId: m.personId,
                name: m.name,
                role: m.role,
                joinedOn: m.joinedOn,
                leftOn: m.leftOn,
              })),
            }))}
          />
        ) : (
          <Banner tone="info" title={t("groups.title")}>{t("forbidden.askAdmin")}</Banner>
        )}
      </main>
    </>
  );
}

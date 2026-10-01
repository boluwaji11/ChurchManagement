import { withTenant, findGroups, listGroupTypes, pendingRequests, personForUser } from "@hearth/db";
import { t } from "@hearth/i18n";
import { PageTitle } from "@/components/section";
import { AppHeader } from "@/components/app-header";
import { requireSession } from "@/lib/session";
import { Finder } from "./finder";

export const dynamic = "force-dynamic";

/**
 * R9.5, R9.6. The one groups screen a member of the church sees.
 *
 * Open to anybody signed in, because the question it answers, "is there
 * something for me on a Tuesday", is not an administrative one.
 */
export default async function FindGroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);
  const actor = { tenantId: session.tenantId, role: session.role, userId: session.userId };

  const { groups, types, requests } = await withTenant(actor, async (tx) => {
    const self = await personForUser(tx, session.userId);
    return {
      groups: await findGroups(tx, { personId: self }),
      types: await listGroupTypes(tx),
      requests: await pendingRequests(tx, actor),
    };
  });

  return (
    <>
      <AppHeader session={session} />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <PageTitle title={t("find.title")} className="mb-6" />

        <Finder
          church={session.tenantSlug}
          types={types.map((type) => ({ id: type.id, name: type.name, hue: type.hue }))}
          requests={requests.map((request) => ({
            id: request.id,
            groupName: request.groupName,
            personName: request.personName,
            message: request.message,
          }))}
          groups={groups.map((group) => ({
            id: group.id,
            name: group.name,
            description: group.description,
            typeId: group.typeId,
            typeName: group.typeName,
            typeHue: group.typeHue,
            dayOfWeek: group.dayOfWeek,
            startsAt: group.startsAt,
            location: group.location,
            memberCount: group.memberCount,
            openToJoin: group.openToJoin,
            full: group.full,
            mine: group.mine,
            requested: group.requested,
          }))}
        />
      </main>
    </>
  );
}

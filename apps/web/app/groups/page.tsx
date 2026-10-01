import {
  withTenant, findGroups, listGroupTypes, pendingRequests, personForUser, canManageGroups,
} from "@hearth/db";
import { t } from "@hearth/i18n";
import { PageTitle } from "@/components/section";
import { AppHeader } from "@/components/app-header";
import { requireSession } from "@/lib/session";
import { Finder } from "./finder";

export const dynamic = "force-dynamic";

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
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);
  const actor = { tenantId: session.tenantId, role: session.role, userId: session.userId };
  const manage = canManageGroups(session.role);

  const { groups, types, requests } = await withTenant(actor, async (tx) => {
    const self = await personForUser(tx, session.userId);
    return {
      groups: await findGroups(tx, { personId: self, manage }),
      types: await listGroupTypes(tx),
      requests: await pendingRequests(tx, actor),
    };
  });

  return (
    <>
      <AppHeader session={session} />
      <main id="main" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <PageTitle title={t("groups.title")} className="mb-6" />

        <Finder
          church={session.tenantSlug}
          canManage={manage}
          types={types.map((type) => ({
            id: type.id,
            name: type.name,
            description: type.description,
            hue: type.hue,
          }))}
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
            endsAt: group.endsAt,
            frequency: group.frequency,
            location: group.location,
            forWhom: group.forWhom,
            online: group.online,
            childrenWelcome: group.childrenWelcome,
            memberCount: group.memberCount,
            openToJoin: group.openToJoin,
            full: group.full,
            mine: group.mine,
            requested: group.requested,
            listed: group.listed,
            archived: group.archived,
          }))}
        />
      </main>
    </>
  );
}

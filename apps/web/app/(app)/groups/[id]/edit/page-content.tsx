import { notFound } from "next/navigation";
import { withTenant, getGroup, listGroupTypes, canManageGroups } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { RecordPanel } from "@/components/record-panel";
import { returnToUnder } from "@/lib/return-to";
import { GroupEditor, GroupFormActions } from "../../group-editor";
import { Denied } from "@/components/denied";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says until the record names itself. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ }>;
}) {
  const {} = await searchParams;
  return tabMetadata(t("nav.groups"));
}

/** R9.2. Changing a group, on the same page that wrote it down. */
export async function EditGroupPanelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { id } = await params;
  const { returnTo } = await searchParams;
  const session = await requireSession();
  const permitted = canManageGroups(session);

  const data = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => ({
      group: await getGroup(tx, id),
      types: permitted ? await listGroupTypes(tx) : [],
    }),
  );

  if (!data.group) notFound();
  const { group, types } = data;

  return (
    <RecordPanel
      title={t("groups.editTitle", { name: group.name })}
      formId="group-form"
      closeTo={returnToUnder(returnTo, "/groups", `/groups/${group.slug}`)}
      cancelTo={permitted ? `/groups/${group.slug}` : undefined}
      width="980px"
      footer={permitted ? <GroupFormActions editing /> : undefined}
    >
      {permitted ? (
        <GroupEditor
          church={session.tenantSlug}
          types={types.map((one) => ({ id: one.id, name: one.name, hue: one.hue }))}
          leaders={group.leaders.map((one) => ({ id: one.memberId, name: one.name }))}
          group={{
            id: group.id,
            slug: group.slug,
            name: group.name,
            description: group.description,
            typeId: group.typeId,
            dayOfWeek: group.dayOfWeek,
            startsAt: group.startsAt,
            endsAt: group.endsAt,
            frequency: group.frequency,
            endsOn: group.endsOn,
            location: group.location,
            addressLine1: group.addressLine1,
            addressLine2: group.addressLine2,
            city: group.city,
            region: group.region,
            postalCode: group.postalCode,
            country: group.country,
            capacity: group.capacity,
            forWhom: group.forWhom,
            online: group.online,
            childrenWelcome: group.childrenWelcome,
            openToJoin: group.openToJoin,
            listed: group.listed,
          }}
        />
      ) : (
        <Denied role={session.role} action="manageGroups" church={session.tenantSlug} />
      )}
    </RecordPanel>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { withTenant, getGroup, listGroupTypes, canManageGroups } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { GroupEditor, GroupFormActions } from "../../group-editor";
import { Denied } from "@/components/denied";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says until the record names itself. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  return tabMetadata(t("nav.groups"), church);
}

/** R9.2. Changing a group, on the same page that wrote it down. */
export default async function EditGroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ church?: string }>;
}) {
  const { id } = await params;
  const { church } = await searchParams;
  const session = await requireSession(church);
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
    <AppShell session={session} tab={group.name} max="max-w-[1080px]">
      <div className="flex items-center gap-3">
        <Link
          href={`/groups/${group.slug}?church=${session.tenantSlug}`}
          className="inline-flex items-center gap-1.5 font-medium text-primary"
        >
          <ArrowLeft className="size-4" /> {group.name}
        </Link>
        <span className="flex-1" />
        {permitted ? <GroupFormActions editing /> : null}
      </div>

      <h1 className="font-display text-[32px] leading-[38px] text-fg">
        {t("groups.editTitle", { name: group.name })}
      </h1>

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
        <Denied />
      )}
    </AppShell>
  );
}

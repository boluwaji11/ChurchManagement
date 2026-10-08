import { withTenant, listRooms, canManageRooms } from "@connectapp/db";
import { requireSession } from "@/lib/session";
import { SettingsHeading } from "../heading";
import { RoomManager, AddRoom } from "./room-manager";
import { Denied } from "@/components/denied";
import { t } from "@connectapp/i18n";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  return tabMetadata(t("settings.tab.rooms"), church);
}

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  const rooms = await withTenant({ tenantId: session.tenantId, role: session.role }, (tx) =>
    listRooms(tx, { includeArchived: true }),
  );

  if (!canManageRooms(session)) {
    return <Denied role={session.role} action="manageRooms" church={session.tenantSlug} />;
  }

  return (
    <>
      <SettingsHeading
        title="settings.tab.rooms"
        lede="settings.lede.rooms"
        action={rooms.length > 0 ? <AddRoom church={session.tenantSlug} /> : undefined}
      />
      <RoomManager
        church={session.tenantSlug}
        rooms={rooms.map((r) => ({
          id: r.id,
          name: r.name,
          hue: r.hue,
          minAgeMonths: r.minAgeMonths,
          maxAgeMonths: r.maxAgeMonths,
          capacity: r.capacity,
          ratio: r.ratio,
          forChildren: r.forChildren,
          archived: r.archivedAt !== null,
        }))}
      />
    </>
  );
}

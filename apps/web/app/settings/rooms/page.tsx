import { withTenant, listRooms, canManageRooms } from "@hearth/db";
import { Banner } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { requireSession } from "@/lib/session";
import { SettingsHeading } from "../heading";
import { RoomManager, AddRoom } from "./room-manager";

export const dynamic = "force-dynamic";

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
    return <Banner tone="info" title={t("rooms.title")}>{t("forbidden.askAdmin")}</Banner>;
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

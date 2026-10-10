import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { withTenant, listRooms, countArchivedRooms, canManageRooms } from "@connectapp/db";
import { requireSession } from "@/lib/session";
import { SettingsHeading } from "../heading";
import { RoomManager, AddRoom } from "./room-manager";
import { Denied } from "@/components/denied";
import { t, plural } from "@connectapp/i18n";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ }>;
}) {
  const {} = await searchParams;
  return tabMetadata(t("settings.tab.rooms"));
}

/**
 * R8.14. The rooms children are checked into.
 *
 * A room that has been put away comes off this grid and sits behind the one
 * link under it, which is also the way back to bringing it out again.
 */
export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const { archived } = await searchParams;
  const session = await requireSession();
  const putAway = archived === "1";

  const { rooms, archivedCount } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => ({
      rooms: await listRooms(tx, putAway ? { archivedOnly: true } : {}),
      archivedCount: await countArchivedRooms(tx),
    }),
  );

  if (!canManageRooms(session)) {
    return <Denied role={session.role} action="manageRooms" church={session.tenantSlug} />;
  }

  return (
    <>
      {putAway ? (
        <Link
          href={"/settings/rooms"}
          className="inline-flex items-center gap-1.5 self-start font-medium text-primary"
        >
          <ArrowLeft className="size-4" /> {t("rooms.archived.back")}
        </Link>
      ) : null}

      <SettingsHeading
        title={putAway ? "rooms.archived.title" : "settings.tab.rooms"}
        lede={putAway ? undefined : "settings.lede.rooms"}
        action={
          !putAway && rooms.length > 0 ? <AddRoom /> : undefined
        }
      />
      <RoomManager
        church={session.tenantSlug}
        putAway={putAway}
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

      {!putAway && archivedCount > 0 ? (
        <Link
          href={"/settings/rooms?archived=1"}
          className="self-start text-label font-medium text-primary underline-offset-4 hover:underline"
        >
          {plural("rooms.archived", archivedCount)}
        </Link>
      ) : null}
    </>
  );
}

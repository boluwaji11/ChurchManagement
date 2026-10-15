"use client";

import { useRouter } from "next/navigation";
import { InvitePerson, type ChurchRoleOption } from "./manage-accesses/team";

/**
 * R1.7, R24.6. Giving somebody an account, from the top of Settings.
 *
 * Settings is one frame over many sections, and this is the one errand a
 * church opens it for that does not belong to any of them, so it sits where
 * every other screen puts its action rather than down inside the Access
 * section.
 *
 * A client component only so the list underneath refreshes once the invitation
 * is sent, which the layout cannot do from the server.
 */
export function InviteAction({
  church,
  roles,
}: {
  church: string;
  roles: ChurchRoleOption[];
}) {
  const router = useRouter();
  return (
    <InvitePerson
      church={church}
      roles={roles}
      pending={false}
      onDone={() => router.refresh()}
    />
  );
}

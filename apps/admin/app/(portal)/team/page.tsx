import { platform } from "@connectapp/db";
import { requireTeamMember } from "@/lib/admin";
import { Screen } from "@/components/screen";
import { On } from "@/components/since";
import { TeamMembers } from "./members";

export const dynamic = "force-dynamic";

export const metadata = { title: "Team - ConnectApp Admin" };

/**
 * R21.x, HRT-401. Who runs the platform, and who has been asked to.
 *
 * Somebody who already signs in to ConnectApp is granted outright: there is no
 * second account to make and no password to send. Somebody who has never used
 * it is sent a link instead, and the grant is made when they open it.
 *
 * Revoking leaves the row, because the log names them and a name that cannot
 * be looked up is a worse record.
 */
export default async function TeamPage() {
  const who = await requireTeamMember();
  const [rows, waiting] = await Promise.all([
    platform.admins(who.id),
    platform.teamInvites(who.id),
  ]);

  return (
    <Screen title="Team" lede="The people who can approve and archive a church.">
      <TeamMembers
        me={who.id}
        waiting={waiting.map((one) => ({
          id: one.id,
          email: one.email,
          name: one.name,
          invitedBy: one.invitedByName,
          expires: <On at={one.expiresAt} />,
        }))}
        rows={rows.map((one) => ({
          userId: one.userId,
          name: one.name,
          email: one.email,
          grantedBy: one.grantedByName,
          granted: <On at={one.grantedAt} />,
          revoked: one.revokedAt !== null,
        }))}
      />
    </Screen>
  );
}

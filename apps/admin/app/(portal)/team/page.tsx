import { platform } from "@connectapp/db";
import { requireTeamMember } from "@/lib/admin";
import { Screen } from "@/components/screen";
import { On } from "@/components/since";
import { TeamMembers } from "./members";

export const dynamic = "force-dynamic";

export const metadata = { title: "Team - ConnectApp Admin" };

/**
 * R21.x. Who operates the platform.
 *
 * Granted by the address somebody already signs in with, so there is no second
 * account to make and no password to send. Revoking leaves the row, because the
 * log names them and a name that cannot be looked up is a worse record.
 */
export default async function TeamPage() {
  const who = await requireTeamMember();
  const rows = await platform.admins(who.id);

  return (
    <Screen title="Team" lede="The people who can approve and archive a church.">
      <TeamMembers
        me={who.id}
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

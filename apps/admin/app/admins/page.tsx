import { platform } from "@connectapp/db";
import { requireOperator } from "@/lib/admin";
import { Shell } from "@/components/shell";
import { On } from "@/components/since";
import { Operators } from "./operators";

export const dynamic = "force-dynamic";

/**
 * R21.x. Who operates the platform.
 *
 * Granted by the address somebody already signs in with, so there is no second
 * account to make and no password to send. Revoking leaves the row, because the
 * log names them and a name that cannot be looked up is a worse record.
 */
export default async function AdminsPage() {
  const who = await requireOperator();
  const rows = await platform.admins(who.id);

  return (
    <Shell who={who} title="Operators" lede="The accounts that can approve and archive a church.">
      <Operators
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
    </Shell>
  );
}

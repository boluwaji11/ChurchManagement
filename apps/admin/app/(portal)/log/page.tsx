import { platform } from "@connectapp/db";
import { EmptyState } from "@connectapp/ui";
import { requireTeamMember } from "@/lib/admin";
import { Screen } from "@/components/screen";
import { Trail } from "@/components/trail";

export const dynamic = "force-dynamic";

export const metadata = { title: "Log - ConnectApp Admin" };

/**
 * R21.x. Everything the operators have done, append only.
 *
 * The same rule a church's own audit log follows: nothing here can be edited
 * or deleted by anybody, including the person who wrote it.
 */
export default async function LogPage() {
  const who = await requireTeamMember();
  const log = await platform.events(who.id, { limit: 200 });

  return (
    <Screen title="Log" lede="What the operators have done, newest first.">
      {log.length === 0 ? (
        <EmptyState title="Nothing has been done here yet." />
      ) : (
        <Trail events={log} />
      )}
    </Screen>
  );
}

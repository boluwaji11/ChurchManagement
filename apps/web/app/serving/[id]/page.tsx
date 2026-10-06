import { redirect } from "next/navigation";
import { withTenant, getTeam } from "@connectapp/db";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * R10.1. The address a team used to have.
 *
 * A team is written in Settings and scheduled on the schedule, so this page is
 * no longer a screen. It stays as the way through, because a leader with the
 * old address in a bookmark or an email should land on the schedule for that
 * team rather than on a 404.
 */
export default async function TeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ church?: string }>;
}) {
  const { id } = await params;
  const { church } = await searchParams;
  const session = await requireSession(church);

  const team = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    (tx) => getTeam(tx, id),
  );

  redirect(
    team
      ? `/serving?church=${session.tenantSlug}&team=${team.id}`
      : `/settings/teams?church=${session.tenantSlug}`,
  );
}

import { redirect } from "next/navigation";
import {
  withTenant, getChurch, memberDirectory, canEditPeople, canReadIncidents,
} from "@hearth/db";
import { EmptyState } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { PageTitle } from "@/components/section";
import { AppHeader } from "@/components/app-header";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { Households } from "./households";

export const dynamic = "force-dynamic";

/**
 * R3.1. The directory a member sees.
 *
 * Open to everybody signed in, because it holds only what each member chose to
 * publish. The staff directory is the other one, and it is a different screen
 * for a different question.
 */
export default async function MemberDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string; q?: string }>;
}) {
  const { church, q } = await searchParams;
  const session = await requireSession(church);

  // A member reaches the same list on their own screen, with their groups above
  // it. This URL is how staff see what the church publishes.
  if (!canEditPeople(session.role) && !canReadIncidents(session.role)) {
    redirect(`/home?church=${session.tenantSlug}`);
  }

  const households = await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId },
    async (tx) => {
      const today = churchNow((await getChurch(tx, session.tenantId))?.timezone ?? "America/Chicago").date;
      return memberDirectory(tx, { asOf: today, q });
    },
  );

  return (
    <>
      <AppHeader session={session} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <PageTitle title={t("memberDirectory.title")} className="mb-6" />

        {households.length === 0 ? (
          <EmptyState title={t("memberDirectory.none.title")} />
        ) : (
          <Households church={session.tenantSlug} households={households} />
        )}
      </main>
    </>
  );
}

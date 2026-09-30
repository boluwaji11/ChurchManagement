import {
  withTenant, findDuplicatePairs, listMerges, getPersonForEdit, canArchivePeople,
} from "@hearth/db";
import { Banner } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { PageTitle } from "@/components/section";
import { requireSession } from "@/lib/session";
import { AppHeader } from "@/components/app-header";
import { Review, type PersonSide } from "./review";

export const dynamic = "force-dynamic";

export default async function DuplicatesPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  // Merging moves every note and every record off one person and onto another,
  // so the review queue is only shown to the roles that may do it.
  if (!canArchivePeople(session.role)) {
    return (
      <>
        <AppHeader session={session} />
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <PageTitle title={t("merge.title")} lede={t("merge.lede")} />
          <Banner tone="info" title={t("forbidden.editPeople")}>{t("forbidden.askAdmin")}</Banner>
        </main>
      </>
    );
  }

  const { pairs, history } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      const found = await findDuplicatePairs(tx);

      // One read per person rather than per pair, because the same record shows
      // up in several pairs when a church has three copies of somebody.
      const ids = [...new Set(found.flatMap((p) => [p.a.id, p.b.id]))];
      const sides = new Map<string, PersonSide>();
      for (const id of ids) {
        const person = await getPersonForEdit(tx, id);
        if (!person) continue;
        sides.set(id, {
          id: person.id,
          name: `${person.preferredName ?? person.firstName} ${person.lastName}`,
          firstName: person.firstName,
          lastName: person.lastName,
          preferredName: person.preferredName ?? null,
          dateOfBirth: person.dateOfBirth ?? null,
          lifecycleStatus: person.lifecycleStatus,
          membershipDate: person.membershipDate ?? null,
          firstVisitOn: person.firstVisitOn ?? null,
          email: person.email ?? null,
          phone: person.phone ?? null,
        });
      }

      return {
        pairs: found
          .filter((p) => sides.has(p.a.id) && sides.has(p.b.id))
          .map((p) => ({
            a: sides.get(p.a.id)!,
            b: sides.get(p.b.id)!,
            confidence: p.confidence,
            reason: p.reason,
          })),
        history: await listMerges(tx),
      };
    },
  );

  return (
    <>
      <AppHeader session={session} />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <PageTitle title={t("merge.title")} lede={t("merge.lede")} />
        <Review
          church={session.tenantSlug}
          pairs={pairs}
          history={history.map((m) => ({
            id: m.id,
            winnerName: m.winnerName,
            loserName: m.loserName,
            mergedAt: m.mergedAt.toLocaleDateString(undefined, {
              day: "numeric", month: "long", year: "numeric",
            }),
            undoneAt: m.undoneAt ? m.undoneAt.toISOString() : null,
            canUndo: m.canUndo,
          }))}
        />
      </main>
    </>
  );
}

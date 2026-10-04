import {
  withTenant, findDuplicatePairs, listMerges, getPersonForEdit, canArchivePeople,
} from "@hearth/db";
import { Banner } from "@hearth/ui";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { t } from "@hearth/i18n";
import { requireSession } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { Review, type PersonSide } from "./review";

export const dynamic = "force-dynamic";

export default async function DuplicatesPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string; a?: string; b?: string }>;
}) {
  const { church, a, b } = await searchParams;
  const session = await requireSession(church);

  // Merging moves every note and every record off one person and onto another,
  // so the review queue is only shown to the roles that may do it.
  if (!canArchivePeople(session)) {
    return (
      <AppShell
        session={session}
        title={t("merge.title")}
      >
          <Banner tone="info" title={t("forbidden.editPeople")}>{t("forbidden.askAdmin")}</Banner>
      </AppShell>
    );
  }

  const { pairs, history } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      const found = await findDuplicatePairs(tx);

      // A pair chosen by hand in the directory. The detector misses real
      // duplicates that share no email, no phone and no spelling of a name.
      const picked = a && b && a !== b ? { a, b } : null;

      // One read per person rather than per pair, because the same record shows
      // up in several pairs when a church has three copies of somebody.
      const ids = [...new Set([
        ...(picked ? [picked.a, picked.b] : []),
        ...found.flatMap((p) => [p.a.id, p.b.id]),
      ])];
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
        pairs: [
          ...(picked && sides.has(picked.a) && sides.has(picked.b)
            ? [{
                a: sides.get(picked.a)!,
                b: sides.get(picked.b)!,
                confidence: "possible",
                reason: "merge.youPicked",
              }]
            : []),
          ...found
            // The picked pair is already at the top, in either order.
            .filter((p) => !picked || ![p.a.id, p.b.id].every((id) => id === picked.a || id === picked.b))
            .filter((p) => sides.has(p.a.id) && sides.has(p.b.id))
            .map((p) => ({
              a: sides.get(p.a.id)!,
              b: sides.get(p.b.id)!,
              confidence: p.confidence as string,
              reason: p.reason as string,
            })),
        ],
        history: await listMerges(tx),
      };
    },
  );

  return (
    <AppShell
      session={session}
      title={t("merge.title")}
      max="max-w-[880px]"
    >
      <Link
        href={`/people?church=${session.tenantSlug}`}
        className="inline-flex items-center gap-1.5 self-start font-medium text-primary"
      >
        <ArrowLeft className="size-4" /> {t("people.title")}
      </Link>

      <div>
        <h2 className="font-display text-[28px] leading-[34px] text-fg">{t("merge.heading")}</h2>
        <p className="mt-1 text-fg-muted">{t("merge.lede")}</p>
      </div>

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
    </AppShell>
  );
}

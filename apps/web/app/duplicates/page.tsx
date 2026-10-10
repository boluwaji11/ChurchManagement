import {
  withTenant, findDuplicatePairs, listMerges, getPersonForEdit, canArchivePeople,
} from "@connectapp/db";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { Review, type PersonSide } from "./review";
import { Denied } from "@/components/denied";
import { tabMetadata } from "@/lib/page-metadata";
import { Pager } from "@/components/pager";

/* R24.6. Each pair is a whole record set against another record, so a screen
   of them is a long read. Five is what fits without scrolling past the first. */
const PER_PAGE = 5;

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ }>;
}) {
  const {} = await searchParams;
  return tabMetadata(t("merge.title"));
}

export default async function DuplicatesPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string; page?: string }>;
}) {
  const { a, b, page } = await searchParams;

  /* R24.6. Five pairs at a time. Each one is a whole record against another
     record, so a screen of them is a long read and a long scroll. */
  const at = Math.max(1, Number(page) || 1);
  const session = await requireSession();

  // Merging moves every note and every record off one person and onto another,
  // so the review queue is only shown to the roles that may do it.
  if (!canArchivePeople(session)) {
    return (
      <Denied role={session.role} action="mergePeople" church={session.tenantSlug} />
      
    );
  }

  const { pairs, on, total, history } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      const found = await findDuplicatePairs(tx);

      // A pair chosen by hand in the directory. The detector misses real
      // duplicates that share no email, no phone and no spelling of a name.
      const picked = a && b && a !== b ? { a, b } : null;

      /*
       * Which pairs, in order, before a single record is read.
       *
       * The page shows five, and reading both people of every pair a church
       * has would be four hundred reads to draw ten records.
       */
      const ordered = [
        ...(picked ? [{ a: picked.a, b: picked.b, confidence: "possible", reason: "merge.youPicked" }] : []),
        ...found
          // The picked pair is already at the top, in either order.
          .filter((p) => !picked || ![p.a.id, p.b.id].every((id) => id === picked.a || id === picked.b))
          .map((p) => ({
            a: p.a.id, b: p.b.id,
            confidence: p.confidence as string,
            reason: p.reason as string,
          })),
      ];

      /*
       * Merging the last pair on a page takes that page away. Without this,
       * somebody who cleared page three lands on an empty screen saying the
       * church has no duplicates while two pages of them sit behind it.
       */
      const last = Math.max(1, Math.ceil(ordered.length / PER_PAGE));
      const on = Math.min(at, last);

      const here = ordered.slice((on - 1) * PER_PAGE, on * PER_PAGE);

      // One read per person rather than per pair, because the same record shows
      // up in several pairs when a church has three copies of somebody.
      const ids = [...new Set(here.flatMap((p) => [p.a, p.b]))];
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
        on,
        total: ordered.length,
        pairs: here
          .filter((p) => sides.has(p.a) && sides.has(p.b))
          .map((p) => ({
            a: sides.get(p.a)!,
            b: sides.get(p.b)!,
            confidence: p.confidence,
            reason: p.reason,
          })),
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
        href={"/members"}
        className="-my-1.5 inline-flex min-h-8 items-center gap-1.5 self-start py-1.5 font-medium text-primary"
      >
        <ArrowLeft className="size-4" /> {t("members.title")}
      </Link>

      <div>
        <h2 className="font-display text-[22px] leading-[28px] text-fg">{t("merge.heading")}</h2>
        <p className="mt-1 text-fg-muted">{t("merge.lede")}</p>
      </div>

      <Review
        church={session.tenantSlug}
        pairs={pairs}
        pager={
          <Pager
            page={on}
            size={PER_PAGE}
            total={total}
            anchor="pairs"
            href={(to) => `/duplicates?${new URLSearchParams({
              ...(a && b ? { a, b } : {}),
              page: String(to),
            })}`}
          />
        }
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

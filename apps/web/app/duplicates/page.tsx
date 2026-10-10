import {
  withTenant, findDuplicateClusters, listMerges, countMerges, getPersonForEdit, canArchivePeople,
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

/* R2.8, R24.6. One person to a screen, however many copies of them there
   are. Deciding whether some records are one person is one decision. */
const PER_PAGE = 1;

/* R24.6. Merging a group of five writes four lines at once, so what a church
   has already merged is a list that grows faster than it is read. */
const PAST_PER_PAGE = 5;

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
  searchParams: Promise<{ a?: string; b?: string; page?: string; past?: string }>;
}) {
  const { a, b, page, past } = await searchParams;

  /* R2.8. Which group is on screen, one-based, as the address writes it. */
  const at = Math.max(1, Number(page) || 1);
  /* And which page of what the church has already merged. */
  const pastAt = Math.max(1, Number(past) || 1);
  const session = await requireSession();

  // Merging moves every note and every record off one person and onto another,
  // so the review queue is only shown to the roles that may do it.
  if (!canArchivePeople(session)) {
    return (
      <Denied role={session.role} action="mergePeople" church={session.tenantSlug} />
      
    );
  }

  const here = (over: Record<string, string>) =>
    `/duplicates?${new URLSearchParams({
      ...(a && b ? { a, b } : {}),
      ...(at > 1 ? { page: String(at) } : {}),
      ...(pastAt > 1 ? { past: String(pastAt) } : {}),
      ...over,
    })}`;
  const pageAt = (to: number) => here({ page: String(to) });
  const pastPageAt = (to: number) => `${here({ past: String(to) })}#past`;

  const { group, on, total, history, pastTotal } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      const found = await findDuplicateClusters(tx);

      // Records chosen by hand in the directory. The detector misses real
      // duplicates that share no email, no phone and no spelling of a name.
      const picked = a && b && a !== b ? [a, b] : null;

      /*
       * Which groups, in order, before a single record is read. The screen
       * shows one, and reading every person in every group a church has would
       * be hundreds of reads to draw five records.
       */
      const ordered = [
        ...(picked && !found.some((c) => picked.every((id) => c.members.some((m) => m.id === id)))
          ? [{ ids: picked, confidence: "possible", reason: "merge.youPicked" }]
          : []),
        ...found.map((c) => ({
          ids: c.members.map((m) => m.id),
          confidence: c.confidence as string,
          reason: c.reason as string,
        })),
      ];

      /*
       * Merging the group on screen takes that screen away. Without this,
       * somebody who cleared the last one lands on an empty page saying the
       * church has no duplicates while the rest of them sit behind it.
       */
      const last = Math.max(1, Math.ceil(ordered.length / PER_PAGE));
      const on = Math.min(at, last);

      const here = ordered[on - 1];

      const ids = here ? [...new Set(here.ids)] : [];
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
          /* R2.8. Five identical records are told apart by when each was
             written, and by nothing else. */
          addedOn: person.createdAt.toLocaleDateString(undefined, {
            day: "numeric", month: "long", year: "numeric",
          }),
        });
      }

      return {
        on,
        total: ordered.length,
        group: here
          ? {
              members: here.ids.filter((id) => sides.has(id)).map((id) => sides.get(id)!),
              confidence: here.confidence,
              reason: here.reason,
            }
          : null,
        history: await listMerges(tx, { page: pastAt, perPage: PAST_PER_PAGE }),
        pastTotal: await countMerges(tx),
      };
    },
  );

  return (
    <AppShell
      session={session}
      title={t("merge.title")}
      wide
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
        group={group}
        at={on}
        total={total}
        back={on > 1 ? pageAt(on - 1) : null}
        on={on < total ? pageAt(on + 1) : null}
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
        pastPager={
          <Pager
            page={pastAt}
            size={PAST_PER_PAGE}
            total={pastTotal}
            anchor="past"
            href={pastPageAt}
          />
        }
      />
    </AppShell>
  );
}

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import {
  withTenant, getChurch, statementGivers, givingYears, canReadGivingAmounts,
} from "@connectapp/db";
import { t, plural } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { Denied } from "@/components/denied";
import { money } from "@/lib/money";
import { StatementsBy } from "./by";
import { YearPicker } from "./year-picker";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  return tabMetadata(t("statement.title"), church);
}

/**
 * R13.17 to R13.19. Who gets a statement, and what each one comes to.
 *
 * January is a deadline a church cannot miss, so this screen is a list and two
 * buttons: print them all for the ones who want paper, or print one when
 * somebody rings up having lost theirs.
 */
export default async function StatementsPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string; year?: string }>;
}) {
  const { church, year: asked } = await searchParams;
  const session = await requireSession(church);

  if (!canReadGivingAmounts(session)) {
    return (
      <Denied role={session.role} action="readGivingAmounts" church={session.tenantSlug} />
      
    );
  }

  const ctx = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };

  const read = await withTenant(ctx, async (tx) => {
    const profile = await getChurch(tx, session.tenantId);
    const here = churchNow(profile?.timezone ?? "America/Chicago").date.slice(0, 4);
    const year = /^\d{4}$/.test(asked ?? "") ? asked! : here;
    // R13.18. A person each, or a household each, as the church has chosen.
    const by: "person" | "household" =
      profile?.statementsBy === "household" ? "household" : "person";
    /* R13.18. Every year with a gift in it, and the year on screen even
       where it has none, so the picker can show what it is set to. */
    const seen = await givingYears(tx);
    const years = seen.includes(year) ? seen : [year, ...seen].sort().reverse();
    return { year, by, years, givers: await statementGivers(tx, ctx, year, by) };
  });

  return (
    <AppShell session={session} title={t("statement.title")} wide>
      <div className="flex flex-col gap-5">
        <Link
          href={`/giving?church=${session.tenantSlug}`}
          className="flex w-fit items-center gap-1.5 font-medium text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden /> {t("giving.count.back")}
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <YearPicker church={session.tenantSlug} year={read.year} years={read.years} />

          <div className="flex flex-wrap items-center gap-3">
            {/* R13.18. The church's own choice, where it is felt. */}
            <StatementsBy church={session.tenantSlug} by={read.by} />
            {read.givers.length > 0 ? (
            <a
              href={`/giving/statements/print?church=${session.tenantSlug}&year=${read.year}`}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex min-h-[var(--d-tap)] items-center gap-1.5 rounded-[var(--d-radius-control)] px-3 font-medium text-primary no-underline hover:bg-sunken"
            >
              <Printer className="size-4" aria-hidden /> {t("statement.print")}
            </a>
            ) : null}
          </div>
        </div>

        {read.givers.length === 0 ? (
          <p className="text-fg-muted">{t("statement.none")}</p>
        ) : (
          <ul className="overflow-hidden rounded-lg border border-line bg-surface">
            {read.givers.map((giver) => (
              <li
                key={giver.memberId}
                className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-0"
              >
                <span className="min-w-0 flex-1 font-medium text-fg">{giver.name}</span>
                <span className="w-[120px] shrink-0 text-[13px] text-fg-muted">
                  {plural("statement.gifts", giver.gifts)}
                </span>
                <span data-numeric className="w-[120px] shrink-0 text-right text-fg">
                  {money(giver.totalCents)}
                </span>
                <a
                  href={`/giving/statements/print?church=${session.tenantSlug}&year=${read.year}&member=${giver.memberId}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="shrink-0 font-medium text-primary no-underline"
                >
                  {t("statement.printOne")}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

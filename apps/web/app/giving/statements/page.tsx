import { Printer } from "lucide-react";
import {
  withTenant, getChurch, statementGivers, givingYears, canReadGivingAmounts,
} from "@connectapp/db";
import { t, plural } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
import { BackLink } from "@/components/back-link";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { Denied } from "@/components/denied";
import { money } from "@/lib/money";
import { Pager } from "@/components/pager";
import { StatementsBy } from "./by";
import { YearPicker } from "./year-picker";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** How many givers are read at once. */
const PER_PAGE = 25;

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
  searchParams: Promise<{ church?: string; year?: string; page?: string }>;
}) {
  const { church, year: asked, page: at } = await searchParams;
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

  /* One screen of names at a time. A church of four hundred givers is four
     hundred rows otherwise, and January is when somebody reads all of it. */
  const page = Number.isInteger(Number(at)) && Number(at) > 0 ? Number(at) : 1;
  const shown = read.givers.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <AppShell session={session} title={t("statement.title")} wide>
      {/* Four short columns do not want the whole of a wide screen: the
          name and the total ended up a hand's width apart. */}
      <div className="flex max-w-3xl flex-col gap-5">
        <BackLink href={`/giving?church=${session.tenantSlug}`} label={t("giving.count.back")} />

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
          <div
            id="givers"
            className="scroll-mt-20 overflow-hidden rounded-lg border border-line bg-surface"
          >
            <ul className="m-0 flex list-none flex-col p-0">
              {shown.map((giver) => (
                <li
                  key={giver.memberId}
                  className="flex flex-wrap items-center gap-4 border-b border-line px-4 py-3 last:border-0"
                >
                  <span className="min-w-0 flex-1 font-medium text-fg">{giver.name}</span>
                  {/* Both figures end on the same edge, so two rows can be
                      compared by looking down rather than across. */}
                  <span
                    data-numeric
                    className="w-[90px] shrink-0 text-right text-[13px] text-fg-muted"
                  >
                    {plural("statement.gifts", giver.gifts)}
                  </span>
                  <span data-numeric className="w-[130px] shrink-0 text-right font-semibold text-fg">
                    {money(giver.totalCents)}
                  </span>
                  <a
                    href={`/giving/statements/print?church=${session.tenantSlug}&year=${read.year}&member=${giver.memberId}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="w-[52px] shrink-0 text-right font-medium text-primary underline underline-offset-4"
                  >
                    {t("statement.printOne")}
                  </a>
                </li>
              ))}
            </ul>

            <Pager
              page={page}
              size={PER_PAGE}
              total={read.givers.length}
              href={(to) =>
                `/giving/statements?church=${session.tenantSlug}&year=${read.year}&page=${to}`
              }
              anchor="givers"
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}

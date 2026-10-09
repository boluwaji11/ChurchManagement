import {
  withTenant, getChurch, givingTotals, givingByMonth, givingByFund,
  lapsedGivers, firstTimeGivers, canReadGivingAmounts,
} from "@connectapp/db";
import { t, plural } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { Denied } from "@/components/denied";
import { churchNow } from "@/lib/church-now";
import { shortDate } from "@/lib/dates";
import { money } from "@/lib/money";
import { ReportFrame, backBy, windowOf } from "../frame";
import { Figure, Figures } from "../figure";
import { Line, RowBars } from "../charts";
import { PagedTable } from "../paged-table";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  return tabMetadata(t("reports.title"), church);
}

/**
 * R13.21, R13.24, R13.25. What the church reads back about its giving.
 *
 * In the order the questions are asked: what came in, the shape of it over
 * the months, which funds it went to, who has stopped giving, and who has
 * started. The lapsed list is the one a pastor acts on.
 */
export default async function GivingReport({
  searchParams,
}: {
  searchParams: Promise<{ church?: string; days?: string }>;
}) {
  const { church, days } = await searchParams;
  const session = await requireSession(church);
  if (!canReadGivingAmounts(session)) {
    return (
      <AppShell session={session} title={t("reports.title")}>
        <Denied
          role={session.role}
          action="manageGiving"
          church={session.tenantSlug}
          back={{ href: `/reports?church=${session.tenantSlug}`, label: t("reports.back") }}
        />
      </AppShell>
    );
  }

  const window = windowOf(days);
  const ctx = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };

  const read = await withTenant(ctx, async (tx) => {
    const clock = churchNow((await getChurch(tx, session.tenantId))?.timezone ?? "America/Chicago");
    const range = { from: backBy(clock.date, window), to: clock.date };
    return {
      range,
      totals: await givingTotals(tx, range),
      months: await givingByMonth(tx, range),
      byFund: await givingByFund(tx, range),
      lapsed: await lapsedGivers(tx, ctx, range.from),
      first: await firstTimeGivers(tx, ctx, range),
    };
  });

  /* R13.9. Everything given to a fund the giver's intent binds. */
  const restricted = read.byFund
    .filter((fund) => fund.restricted)
    .reduce((sum, fund) => sum + fund.cents, 0);

  const average = read.totals.givers > 0
    ? Math.round(read.totals.cents / read.totals.givers)
    : 0;

  return (
    <AppShell session={session} title={t("reports.title")} wide>
      <ReportFrame
        church={session.tenantSlug}
        title={t("reports.giving.title")}
        window={window}
        path="giving"
        /* R18.10. Held with the rest of the money: this report has no file
           behind it yet, and the press that pointed at one answered with a
           missing page. */
        files="none"
      >
        <Figures>
          <Figure
            label={t("reports.giving.total")}
            value={money(read.totals.cents)}
            sub={plural("giving.givers.sub", read.totals.gifts)}
            hue="fern"
          />
          <Figure
            label={t("reports.giving.givers")}
            value={String(read.totals.givers)}
            sub={t("reports.giving.average", { amount: money(average) })}
            hue="violet"
          />
          <Figure
            label={t("reports.giving.lapsed")}
            value={String(read.lapsed.length)}
            sub={t("reports.giving.lapsed.sub")}
            hue="amber"
          />
        </Figures>

        {/* R13.9. What the giver's intent binds, apart from what it does
            not. A board asking what the church can spend is asking for the
            first of these two numbers. */}
        {restricted > 0 ? (
          <Figures>
            <Figure
              label={t("giving.funds.available")}
              value={money(read.totals.cents - restricted)}
              sub={t("giving.funds.availableWhy")}
              hue="sky"
            />
            <Figure
              label={t("giving.funds.restricted")}
              value={money(restricted)}
              sub={t("giving.funds.restrictedWhy")}
              hue="orchid"
            />
          </Figures>
        ) : null}

        <Line
          title={t("reports.giving.overTime")}
          points={read.months.map((one) => ({
            key: one.key,
            label: one.label,
            value: Math.round(one.value / 100),
          }))}
          hue="fern"
        />

        <RowBars
          title={t("reports.giving.byFund")}
          rows={read.byFund.map((fund) => ({
            key: fund.id,
            label: fund.restricted ? `${fund.name} · ${t("giving.restricted")}` : fund.name,
            value: Math.round(fund.cents / 100),
            note: money(fund.cents),
          }))}
          hue="violet"
        />

        <PagedTable
          title={t("reports.giving.lapsed")}
          columns={[t("reports.name"), t("reports.giving.lastGift"), t("giving.gift.amount")]}
          rows={read.lapsed.map((one) => ({
            key: one.id,
            href: `/members/${one.id}?church=${session.tenantSlug}`,
            cells: [
              { text: one.name },
              { text: shortDate(one.lastOn) },
              { text: money(one.cents), numeric: true },
            ],
          }))}
        />

        <PagedTable
          title={t("reports.giving.first")}
          columns={[t("reports.name"), t("reports.giving.firstGift"), t("giving.gift.amount")]}
          rows={read.first.map((one) => ({
            key: one.id,
            href: `/members/${one.id}?church=${session.tenantSlug}`,
            cells: [
              { text: one.name },
              { text: shortDate(one.firstOn) },
              { text: money(one.cents), numeric: true },
            ],
          }))}
        />
      </ReportFrame>
    </AppShell>
  );
}

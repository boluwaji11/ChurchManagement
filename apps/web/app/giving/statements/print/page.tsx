import { redirect } from "next/navigation";
import {
  withTenant, getChurch, statementFor, statementGivers, canReadGivingAmounts,
  type Statement,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { longDate } from "@/lib/dates";
import { money } from "@/lib/money";
import { AutoPrint } from "@/app/checkin/rooms/print/auto-print";
import { photoUrls } from "@/lib/photos";
import { Letterhead, Recipient } from "../../statement/letterhead";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  return tabMetadata(t("giving.statements"), church);
}

/**
 * R13.17. The statement itself, as it goes in an envelope.
 *
 * Publication 1771 decides what is on this page: the church's name, every gift
 * with its date and amount, a description of anything given in kind with no
 * value put on it by the church, and the sentence about goods and services.
 * One statement a page, so a print of two hundred comes out ready to fold.
 */
export default async function StatementPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string; year?: string; member?: string }>;
}) {
  const { church, year: asked, member } = await searchParams;
  const session = await requireSession(church);
  /*
   * A sheet with no shell around it, so the refusal panel has nowhere to
   * sit. Back to the screen this sheet was asked for from, which says why.
   */
  if (!canReadGivingAmounts(session)) redirect(`/giving/statements?church=${session.tenantSlug}`);

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
    const by = profile?.statementsBy === "household" ? "household" : "person";

    const people = member
      ? [member]
      : (await statementGivers(tx, ctx, year, by)).map((one) => one.memberId);

    const statements: Statement[] = [];
    for (const id of people) {
      const one = await statementFor(tx, ctx, id, year, by);
      if (one && one.lines.length > 0) statements.push(one);
    }

    return { profile, year, statements };
  });

  /* The bucket is private, so the mark is served through a signed link. */
  const logoKey = read.profile?.logoKey ?? null;
  const logoUrl = logoKey ? ((await photoUrls([logoKey]))[logoKey] ?? null) : null;

  const address = [
    read.profile?.addressLine1,
    read.profile?.city,
    read.profile?.region,
    read.profile?.postalCode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="bg-white text-black">
      <AutoPrint />
      <style>{"@page { size: auto; margin: 0; }"}</style>

      {read.statements.map((statement) => {
        const inKind = statement.lines.filter((line) => line.inKindDescription);
        const cash = statement.lines.filter((line) => !line.inKindDescription);

        return (
          <section
            key={statement.memberId}
            className="mx-auto max-w-3xl px-10 py-10 break-after-page"
          >
            {/* R13.17. The church on the left, whoever it is for on the
                right, which is how a letter is laid out. */}
            <div className="flex items-start justify-between gap-8">
              <Letterhead
                name={read.profile?.legalName || session.tenantName}
                address={address}
                logoUrl={logoUrl}
              />
              <Recipient name={statement.name} address={statement.address} />
            </div>

            <header className="mt-3 border-b-2 border-black pb-3">
              <h1 className="font-display text-[30px] leading-[38px]">
                {t("statement.heading", { year: read.year })}
              </h1>
            </header>

            <div className="mt-5">
              {cash.map((line, at) => (
                <div
                  key={`${line.date}-${at}`}
                  className="flex items-baseline gap-4 border-b border-neutral-200 py-2 last:border-0"
                >
                  <span className="w-[140px] shrink-0 text-[14px]">{longDate(line.date)}</span>
                  <span className="min-w-0 flex-1 text-[15px]">{line.fund}</span>
                  <span className="w-[120px] shrink-0 text-right text-[15px]">
                    {money(line.amountCents)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-baseline justify-between border-t-2 border-black pt-3">
              <span className="font-display text-[20px]">{t("statement.total")}</span>
              <span className="text-[22px] font-semibold">
                {money(statement.totalCents)}
              </span>
            </div>

            {/* R13.17. Described, never valued: the giver values their own gift. */}
            {inKind.length > 0 ? (
              <div className="mt-6">
                <h2 className="text-[13px] font-semibold tracking-[0.06em] uppercase">
                  {t("statement.inKind")}
                </h2>
                {inKind.map((line, at) => (
                  <div
                    key={`${line.date}-kind-${at}`}
                    className="flex items-baseline gap-4 border-b border-neutral-200 py-2 last:border-0"
                  >
                    <span className="w-[140px] shrink-0 text-[14px]">{longDate(line.date)}</span>
                    <span className="min-w-0 flex-1 text-[15px]">{line.inKindDescription}</span>
                  </div>
                ))}
                <p className="mt-2 text-[13px] text-neutral-600">{t("statement.inKind.note")}</p>
              </div>
            ) : null}

            <p className="mt-8 text-[14px]">{t("statement.goods")}</p>
            {statement.needsAcknowledgment ? (
              <p className="mt-2 text-[14px]">{t("statement.ack")}</p>
            ) : null}
          </section>
        );
      })}
    </main>
  );
}

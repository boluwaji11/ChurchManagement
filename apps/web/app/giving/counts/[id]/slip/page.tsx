import { notFound, redirect } from "next/navigation";
import { withTenant, getBatch, listGifts, getChurch, canManageGiving } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { longDate } from "@/lib/dates";
import { money } from "@/lib/money";
import { AutoPrint } from "@/app/checkin/rooms/print/auto-print";

export const dynamic = "force-dynamic";

/**
 * R13.22. The deposit slip, which is what the treasurer takes to the bank.
 *
 * It says what is in the bag, in the order the bank counts it: the cheques one
 * by one with their numbers, the cash as one line, and the total that has to
 * match the paying-in slip. The counters are named on it, because the slip is
 * the record of who handled the money.
 */
export default async function DepositSlipPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ church?: string }>;
}) {
  const { id } = await params;
  const { church } = await searchParams;
  const session = await requireSession(church);
  if (!canManageGiving(session)) redirect(`/giving?church=${session.tenantSlug}`);

  const ctx = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };

  const read = await withTenant(ctx, async (tx) => ({
    count: await getBatch(tx, id),
    lines: await listGifts(tx, ctx, { batchId: id, limit: 500 }),
    profile: await getChurch(tx, session.tenantId),
  }));

  if (!read.count) notFound();

  const cheques = read.lines.filter((one) => one.method === "cheque");
  const cash = read.lines.filter((one) => one.method === "cash");
  const other = read.lines.filter(
    (one) => one.method !== "cheque" && one.method !== "cash" && !one.inKindDescription,
  );

  const sum = (rows: { amountCents: number }[]) =>
    rows.reduce((total, one) => total + one.amountCents, 0);

  return (
    <main className="mx-auto min-h-dvh max-w-3xl bg-white px-10 py-9 text-black print:max-w-none">
      <AutoPrint />
      <style>{"@page { size: auto; margin: 0; }"}</style>

      <div className="text-[13px] font-medium text-neutral-500">
        {read.profile?.legalName || session.tenantName}
      </div>

      <header className="mt-1 flex items-baseline justify-between gap-6 border-b-2 border-black pb-3">
        <h1 className="font-display text-[30px] leading-[38px]">{read.count.name}</h1>
        <span className="text-[15px]">{longDate(read.count.receivedOn)}</span>
      </header>

      {cheques.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-[13px] font-semibold tracking-[0.06em] uppercase">
            {t("giving.method.cheque")}
          </h2>
          {cheques.map((one) => (
            <div
              key={one.id}
              className="flex items-baseline gap-4 border-b border-neutral-200 py-2 last:border-0"
            >
              <span className="w-[90px] shrink-0 font-mono text-[14px]">
                {one.reference ?? ""}
              </span>
              <span className="min-w-0 flex-1 text-[15px]">
                {one.memberName ?? t("giving.gift.anonymous")}
              </span>
              <span className="w-[120px] shrink-0 text-right font-mono text-[15px]">
                {money(one.amountCents)}
              </span>
            </div>
          ))}
          <div className="flex items-baseline justify-between border-t border-black pt-2 text-[15px] font-semibold">
            <span>{t("giving.method.cheque")}</span>
            <span className="font-mono">{money(sum(cheques))}</span>
          </div>
        </section>
      ) : null}

      {cash.length > 0 ? (
        <section className="mt-6 flex items-baseline justify-between border-t border-black pt-2 text-[15px] font-semibold">
          <span>{t("giving.method.cash")}</span>
          <span className="font-mono">{money(sum(cash))}</span>
        </section>
      ) : null}

      {other.length > 0 ? (
        <section className="mt-6 flex items-baseline justify-between border-t border-neutral-200 pt-2 text-[15px]">
          <span>{t("giving.method.other")}</span>
          <span className="font-mono">{money(sum(other))}</span>
        </section>
      ) : null}

      <section className="mt-8 flex items-baseline justify-between border-t-2 border-black pt-3">
        <span className="font-display text-[22px]">{t("giving.count.lines")}</span>
        <span className="font-mono text-[24px] font-semibold">
          {money(read.count.enteredCents)}
        </span>
      </section>

      {read.count.varianceNote ? (
        <p className="mt-4 text-[14px] text-neutral-600">
          {t("giving.count.variance")}: {read.count.varianceNote}
        </p>
      ) : null}

      {/* R13.11. The two who counted it sign the slip. */}
      <section className="mt-12 flex gap-10">
        {[0, 1].map((at) => (
          <span key={at} className="flex flex-1 flex-col gap-10">
            <span className="border-b border-black" />
            <span className="-mt-8 text-[12px] text-neutral-500">
              {at === 0 ? t("giving.count.counterOne") : t("giving.count.counterTwo")}
            </span>
          </span>
        ))}
      </section>
    </main>
  );
}

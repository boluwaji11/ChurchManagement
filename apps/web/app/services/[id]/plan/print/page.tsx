import { notFound, redirect } from "next/navigation";
import {
  withTenant, getOccurrence, getPlan, runningTimes,
  canManageServices,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { dayAndMonth, readableTime } from "@/lib/dates";
import { AutoPrint } from "@/app/checkin/rooms/print/auto-print";

export const dynamic = "force-dynamic";

/**
 * R11.10. The order of service on paper, in two versions.
 *
 * The full one is what the team runs the service from: the clock, the
 * lengths, the notes and who is doing what. The bulletin one is what is handed
 * to the congregation, so it is the titles in order and nothing else. The same
 * plan printed two ways, because a church that has to retype its order into a
 * word processor every week will keep the word processor.
 */
export default async function PrintPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ church?: string; view?: string }>;
}) {
  const { id } = await params;
  const { church, view } = await searchParams;
  const session = await requireSession(church);

  if (!canManageServices(session)) {
    redirect(`/services/${id}?church=${session.tenantSlug}`);
  }

  const bulletin = view === "bulletin";

  const result = await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions },
    async (tx) => {
      const occurrence = await getOccurrence(tx, id);
      if (!occurrence) return null;
      const occurrenceId = occurrence.id;
      if (!occurrence) return null;
      return {
        occurrence,
        plan: await getPlan(tx, occurrenceId),
      };
    },
  );

  if (!result?.plan) notFound();
  const { occurrence, plan } = result;
  const timed = runningTimes(plan.serviceStartsAt, plan.items);

  return (
    <main className="mx-auto min-h-dvh max-w-4xl px-10 py-9 bg-white text-black print:max-w-none">
      <AutoPrint />

      {/* The browser draws its own date, title, URL and page number into the
          page margin. A zero margin takes them off, and the padding above puts
          the white space back where we want it. */}
      <style>{"@page { size: auto; margin: 0; }"}</style>

      <div className="text-[13px] font-medium text-neutral-500">{session.tenantName}</div>

      <header className="mt-1 flex items-baseline justify-between gap-6 border-b-2 border-black pb-3">
        <h1 className="whitespace-nowrap font-display text-[34px] leading-[42px]">
          {`${dayAndMonth(occurrence.occursOn)} · ${readableTime(occurrence.startsAt)}`}
        </h1>
        {plan.series || plan.theme ? (
          <span className="shrink-0 text-[15px] text-neutral-600">
            {[plan.theme, plan.series].filter(Boolean)[0]}
          </span>
        ) : null}
      </header>

      {bulletin ? (
        /* R11.10. What is handed out: the order, and nothing the congregation
           has no use for. */
        <ol className="flex flex-col gap-2 text-[length:var(--d-text-body)]">
          {plan.items.map((item) => (
            <li key={item.id}>{item.title}</li>
          ))}
        </ol>
      ) : (
        <>
          <div className="mt-5">
            {timed.items.map((item) => (
              <div
                key={item.id}
                className="flex items-baseline gap-4 border-b border-neutral-200 py-3 last:border-0"
              >
                <span className="w-[72px] shrink-0 font-mono text-[15px]">
                  {readableTime(item.startsAt)}
                </span>
                <span className="w-[130px] shrink-0 text-[15px] text-neutral-500">
                  {t(`order.kind.${item.kind}` as never)}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{item.title}</span>
                  {item.description ? (
                    <span className="block text-neutral-500">{item.description}</span>
                  ) : null}
                  {item.notes.length > 0 ? (
                    <ul className="mt-1 flex flex-col gap-0.5 text-[14px] text-neutral-600">
                      {item.notes.map((note) => (
                        <li key={note.id}>
                          {note.audience ? <strong>{note.audience} </strong> : null}
                          {note.body}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </span>

                <span className="shrink-0 whitespace-nowrap font-mono text-[15px]">
                  {t("order.runsMin", { count: item.minutes })}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-3 text-right text-[15px] text-neutral-600">
            {t("print.order.ends", { time: readableTime(timed.endsAt) })}
          </p>

        </>
      )}
    </main>
  );
}

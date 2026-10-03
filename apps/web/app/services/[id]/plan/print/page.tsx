import { notFound, redirect } from "next/navigation";
import {
  withTenant, getOccurrence, getPlan, runningTimes, rosterFor, getChurch,
  canManageServices,
} from "@hearth/db";
import { t } from "@hearth/i18n";
import { requireSession } from "@/lib/session";
import { dayAndMonth, readableTime } from "@/lib/dates";
import { AutoPrint } from "@/app/checkin/rooms/print/auto-print";
import { BrandRuleFor } from "@/components/brand-rule";

export const dynamic = "force-dynamic";

/**
 * R11.10. The order of service on paper, in two versions.
 *
 * The full one is what the team runs the gathering from: the clock, the
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

  if (!canManageServices(session.role)) {
    redirect(`/services/${id}?church=${session.tenantSlug}`);
  }

  const bulletin = view === "bulletin";

  const result = await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId },
    async (tx) => {
      const occurrence = await getOccurrence(tx, id);
      if (!occurrence) return null;
      return {
        occurrence,
        plan: await getPlan(tx, id),
        roster: bulletin ? [] : await rosterFor(tx, id),
        // R1.1. The church's own colour on the sheet it hands out.
        hue: (await getChurch(tx, session.tenantId))?.brandHue ?? "indigo",
      };
    },
  );

  if (!result?.plan) notFound();
  const { occurrence, plan, roster, hue } = result;
  const timed = runningTimes(plan.serviceStartsAt, plan.items);

  return (
    <main className="mx-auto max-w-2xl px-6 py-8 text-black print:max-w-none print:px-10 print:py-8">
      <AutoPrint />

      {/* The browser draws its own date, title, URL and page number into the
          page margin. A zero margin takes them off, and the padding above puts
          the white space back where we want it. */}
      <style>{"@page { size: auto; margin: 0; }"}</style>

      <BrandRuleFor hue={hue} className="mb-5 h-1.5 w-full print:h-[3mm]" />

      <header className="mb-6 border-b border-black pb-3">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="font-display text-display">{occurrence.name}</h1>
          <span className="text-[length:var(--d-text-body)]">
            {dayAndMonth(occurrence.occursOn)} {readableTime(occurrence.startsAt)}
          </span>
        </div>
        {plan.series || plan.theme ? (
          <p className="mt-1 text-[length:var(--d-text-body)]">
            {[plan.series, plan.theme].filter(Boolean).join(". ")}
          </p>
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
          <table className="w-full text-left text-[length:var(--d-text-body)]">
            <thead>
              <tr className="border-b border-black">
                <th className="w-20 py-1.5 font-medium">{t("print.order.time")}</th>
                <th className="py-1.5 font-medium">{t("print.order.item")}</th>
                <th className="w-16 py-1.5 text-right font-medium">
                  {t("print.order.minutes")}
                </th>
              </tr>
            </thead>
            <tbody>
              {timed.items.map((item) => (
                <tr key={item.id} className="border-b border-black/20 align-top">
                  <td className="py-2 tabular-nums">{readableTime(item.startsAt)}</td>
                  <td className="py-2">
                    <span className="block">{item.title}</span>
                    <span className="block text-caption">
                      {t(`order.kind.${item.kind}` as never)}
                      {item.description ? `. ${item.description}` : ""}
                    </span>
                    {item.notes.length > 0 ? (
                      <ul className="mt-1 flex flex-col gap-0.5 text-caption">
                        {item.notes.map((note) => (
                          <li key={note.id}>
                            {note.audience ? <strong>{note.audience} </strong> : null}
                            {note.body}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </td>
                  <td className="py-2 text-right tabular-nums">{item.minutes}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-3 text-right text-[length:var(--d-text-body)]">
            {t("print.order.ends", { time: readableTime(timed.endsAt) })}
          </p>

          {/* R11.9. Who is doing what, so the sheet on the music stand is the
              sheet that says who is missing. */}
          {roster.length > 0 ? (
            <section className="mt-8">
              <h2 className="mb-2 border-b border-black pb-1 font-display text-heading">
                {t("print.order.serving")}
              </h2>
              <ul className="flex flex-col gap-2 text-[length:var(--d-text-body)]">
                {roster.map((team) => (
                  <li key={team.id}>
                    <strong>{team.name}</strong>
                    <ul className="flex flex-col">
                      {team.positions.map((position) => (
                        <li key={position.id}>
                          {position.name}:{" "}
                          {position.entries
                            .filter((entry) => entry.status !== "declined")
                            .map((entry) => entry.personName)
                            .join(", ")}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </main>
  );
}

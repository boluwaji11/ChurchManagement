import { redirect } from "next/navigation";
import {
  withTenant, getChurch, listCelebrations, addressesFor,
  monthWindow, weekWindow, canEditPeople,
  type CelebrationWindow,
} from "@hearth/db";
import { t } from "@hearth/i18n";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { shortDate } from "@/lib/dates";
import { AutoPrint } from "../../../checkin/rooms/print/auto-print";

export const dynamic = "force-dynamic";

/**
 * R2.11. The card list, on paper.
 *
 * What a church actually does with the celebrations screen is write cards at a
 * table, so the sheet is a tick list: the day, who it is for, what the card
 * says, and the address to put on the envelope.
 */

const ISO = /^\d{4}-\d{2}-\d{2}$/;

const monthName = (iso: string): string =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" });

export default async function CardListPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string; view?: string; at?: string }>;
}) {
  const params = await searchParams;
  const session = await requireSession(params.church);

  if (!canEditPeople(session)) {
    redirect(`/home?church=${session.tenantSlug}`);
  }

  const view = params.view === "week" ? "week" : "month";

  const { celebrations, addresses, window } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      const church = await getChurch(tx, session.tenantId);
      const now = churchNow(church?.timezone ?? "America/Chicago").date;
      const asked = params.at && ISO.test(params.at) ? params.at : now;
      const [y, m] = asked.split("-").map(Number);
      const w: CelebrationWindow = view === "week" ? weekWindow(asked) : monthWindow(y!, m!);
      const rows = await listCelebrations(tx, w);

      return {
        window: w,
        celebrations: rows,
        addresses: await addressesFor(tx, [...new Set(rows.map((c) => c.personId))]),
      };
    },
  );

  const span = view === "week"
    ? t("celebrations.span", { from: shortDate(window.from), to: shortDate(window.to) })
    : monthName(window.from);

  return (
    <main className="mx-auto min-h-dvh max-w-4xl px-10 py-9 bg-white text-black print:max-w-none">
      <AutoPrint />
      <style>{"@page { size: auto; margin: 0; }"}</style>

      <div className="text-[13px] font-medium text-neutral-500">{session.tenantName}</div>

      <header className="mt-1 flex items-baseline justify-between gap-6 border-b-2 border-black pb-3">
        <h1 className="font-display text-[34px] leading-[42px]">{t("celebrations.cards.title")}</h1>
        <span className="shrink-0 text-[15px] text-neutral-600">{span}</span>
      </header>

      <table className="mt-5 w-full border-collapse text-[15px]">
        <thead>
          <tr className="text-left">
            <th className="w-10 border-b border-neutral-300 pb-2.5" />
            <th className="w-[90px] border-b border-neutral-300 pb-2.5 font-semibold">
              {t("celebrations.day")}
            </th>
            <th className="border-b border-neutral-300 pb-2.5 font-semibold">
              {t("celebrations.who")}
            </th>
            <th className="border-b border-neutral-300 pb-2.5 font-semibold">
              {t("celebrations.cards.cardFor")}
            </th>
            <th className="border-b border-neutral-300 pb-2.5 font-semibold">
              {t("celebrations.cards.address")}
            </th>
          </tr>
        </thead>
        <tbody>
          {celebrations.map((c) => (
            <tr key={`${c.kind}-${c.personId}-${c.on}`} className="break-inside-avoid">
              <td className="border-b border-neutral-200 py-3">
                {/* The box the volunteer ticks when the card is written. */}
                <span className="block size-[18px] rounded-[3px] border-[1.5px] border-neutral-700" />
              </td>
              <td className="whitespace-nowrap border-b border-neutral-200 py-3 pr-4">
                {shortDate(c.on)}
              </td>
              <td className="border-b border-neutral-200 py-3 pr-4 font-semibold">
                {c.partnerName
                  ? t("celebrations.couple", { one: c.name, two: c.partnerName })
                  : c.name}
              </td>
              <td className="whitespace-nowrap border-b border-neutral-200 py-3 pr-4">
                {[
                  c.kind === "birthday"
                    ? t("celebrations.kind.birthday")
                    : t("celebrations.kind.anniversary"),
                  c.years === null
                    ? null
                    : c.kind === "birthday"
                      ? t("celebrations.turning", { years: c.years })
                      : t("celebrations.married", { years: c.years }),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </td>
              <td className="border-b border-neutral-200 py-3 text-neutral-600">
                {addresses.get(c.personId) ?? ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-5 text-[14px] text-neutral-500">{t("celebrations.cards.tick")}</p>
    </main>
  );
}

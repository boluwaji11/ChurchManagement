import {
  withTenant, roomRoster, listRooms, listOccurrences, getChurch, canSupervise,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { ageLine } from "@/lib/room-ages";
import { AutoPrint } from "./auto-print";
import { Denied } from "@/components/denied";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  return tabMetadata(t("rooms.title"), church);
}

/**
 * R8.18. The class rosters, on paper.
 *
 * Its own page rather than a print stylesheet over the board, because printing
 * a region of a screen means fighting the browser over what to leave out, and
 * what gets left out by accident here is a child's allergy.
 *
 * Every class on one sheet, two to a row, because the person holding it is
 * walking a corridor with all of them on it.
 */

const day = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short", day: "numeric", month: "short",
  });

const clock = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const at = new Date();
  at.setHours(h ?? 0, m ?? 0, 0, 0);
  return at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
};

export default async function RosterPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string; service?: string; room?: string }>;
}) {
  const { church, service, room } = await searchParams;
  const session = await requireSession(church);

  if (!canSupervise(session) || !service) {
    return (
      <main id="main" className="mx-auto min-h-dvh max-w-lg px-4 py-8">
        <Denied role={session.role} action="checkIn" church={session.tenantSlug} />
      </main>
    );
  }

  const { sheets, when, occurrence } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      const profile = await getChurch(tx, session.tenantId);
      const now = churchNow(profile?.timezone ?? "America/Chicago");
      const rooms = await listRooms(tx);
      const wanted = room ? rooms.filter((r) => r.id === room) : rooms;
      const today = await listOccurrences(tx, { from: now.date, to: now.date });

      return {
        when: now,
        occurrence: today.find((o) => o.id === service) ?? null,
        sheets: await Promise.all(
          wanted.map(async (r) => ({
            id: r.id,
            name: r.name,
            capacity: r.capacity,
            ages: ageLine(r),
            entries: (await roomRoster(tx, service, r.id)).filter(
              (e) => e.checkedOutAt === null,
            ),
          })),
        ),
      };
    },
  );

  return (
    <main className="mx-auto max-w-4xl px-10 py-9 bg-white text-black print:max-w-none">
      <AutoPrint />
      <style>{"@page { size: auto; margin: 0; }"}</style>

      <div className="text-[13px] font-medium text-neutral-500">{session.tenantName}</div>

      <header className="mt-1 flex items-baseline justify-between gap-6 border-b-2 border-black pb-3">
        <h1 className="font-display text-[34px] leading-[42px]">{t("print.roster.title")}</h1>
        <span className="shrink-0 text-[15px] text-neutral-600">
          {occurrence
            ? t("print.roster.header", {
                date: day(when.date),
                service: `${clock(occurrence.startsAt)} ${occurrence.name}`,
              })
            : day(when.date)}
        </span>
      </header>

      <div className="mt-6 grid gap-x-10 gap-y-8 sm:grid-cols-2 print:grid-cols-2">
        {sheets.map((sheet) => (
          <section key={sheet.id} className="break-inside-avoid">
            <div className="flex items-baseline justify-between gap-3 pb-1.5">
              <h2 className="text-[17px] font-semibold">{sheet.name}</h2>
              <span className="text-[14px] text-neutral-600">
                {[
                  sheet.capacity === null
                    ? String(sheet.entries.length)
                    : t("print.roster.count", {
                        present: sheet.entries.length,
                        capacity: sheet.capacity,
                      }),
                  sheet.ages,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>

            <div className="border-t border-black" />

            {sheet.entries.map((entry) => (
              <div
                key={entry.visitId}
                className="flex items-baseline justify-between gap-3 py-2 text-[15px]"
              >
                <span>{entry.name}</span>
                <span className="flex items-baseline gap-3">
                  {entry.allergies || entry.medicalNote ? (
                    <span className="text-[13px] font-bold uppercase tracking-wide">
                      {[entry.allergies, entry.medicalNote].filter(Boolean).join(" · ")}
                    </span>
                  ) : null}
                  {entry.code ? <span className="font-mono">{entry.code}</span> : null}
                </span>
              </div>
            ))}

            {sheet.entries.length === 0 ? (
              <p className="py-2 text-[15px] text-neutral-500">{t("board.empty")}</p>
            ) : null}
          </section>
        ))}
      </div>
    </main>
  );
}

import { withTenant, roomRoster, listRooms, canSupervise, getChurch } from "@hearth/db";
import { Banner } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { AutoPrint } from "./auto-print";

export const dynamic = "force-dynamic";

/**
 * R8.18. The class roster, on paper.
 *
 * Its own page rather than a print stylesheet over the board, because printing
 * a region of a screen means fighting the browser over what to leave out, and
 * what gets left out by accident here is a child's allergy.
 *
 * It is what goes on the wall of the room: who is in here, who has been
 * collected, the code on their label, and what somebody has to know about them.
 */
export default async function RosterPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string; service?: string; room?: string }>;
}) {
  const { church, service, room } = await searchParams;
  const session = await requireSession(church);

  if (!canSupervise(session.role) || !service || !room) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8">
        <Banner tone="info" title={t("board.title")}>{t("forbidden.askAdmin")}</Banner>
      </main>
    );
  }

  const { entries, name, churchName, when } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      const profile = await getChurch(tx, session.tenantId);
      const rooms = await listRooms(tx);
      return {
        entries: await roomRoster(tx, service, room),
        name: rooms.find((r) => r.id === room)?.name ?? "",
        churchName: session.tenantName,
        when: churchNow(profile?.timezone ?? "America/Chicago"),
      };
    },
  );

  return (
    <main className="mx-auto max-w-2xl px-6 py-8 text-black print:max-w-none print:px-10 print:py-8">
      <AutoPrint />

      {/* The browser draws its own date, title, URL and page number into the
          page margin. A zero margin takes them off, and the padding below puts
          the white space back where we want it. */}
      <style>{"@page { size: auto; margin: 0; }"}</style>

      <header className="mb-6 flex items-baseline justify-between gap-4 border-b border-black pb-3">
        <h1 className="font-display text-display">{name}</h1>
        <span className="text-[length:var(--d-text-body)]">
          {churchName} {when.date} {when.time}
        </span>
      </header>

      <table className="w-full text-left text-[length:var(--d-text-body)]">
        <thead>
          <tr className="border-b border-black">
            <th className="py-1.5 font-medium">{t("print.roster.name")}</th>
            <th className="py-1.5 font-medium">{t("print.roster.code")}</th>
            <th className="py-1.5 font-medium">{t("print.roster.needs")}</th>
            <th className="py-1.5 font-medium">{t("print.roster.out")}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.personId} className="border-b border-black/20 align-top">
              <td className="py-2">{entry.name}</td>
              <td className="py-2 font-mono tracking-widest">{entry.code ?? ""}</td>
              <td className="py-2">
                {[entry.allergies, entry.medicalNote].filter(Boolean).join(". ")}
              </td>
              <td className="py-2">{entry.checkedOutAt ? t("board.gone") : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {entries.length === 0 ? <p className="py-4">{t("board.empty")}</p> : null}
    </main>
  );
}

import { notFound, redirect } from "next/navigation";
import {
  withTenant, getEvent, getForm, listRegistrations, canManageEvents,
} from "@hearth/db";
import { t } from "@hearth/i18n";
import { requireSession } from "@/lib/session";
import { longDate, readableTime } from "@/lib/dates";
import { oneLineAddress } from "@/lib/address";
import { AutoPrint } from "@/app/checkin/rooms/print/auto-print";

export const dynamic = "force-dynamic";

/** An answer as one cell. A list of choices reads as a list. */
function answerText(value: unknown): string {
  if (value === true) return t("common.yes");
  if (value === false || value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

/**
 * R14.12. The roster and the emergency contact sheet, on paper.
 *
 * Its own page rather than a print stylesheet over the event screen, for the
 * same reason the class rosters have one: printing a region of a screen means
 * fighting the browser over what to leave out, and here what gets left out by
 * accident is the number somebody rings when a child is hurt.
 *
 * Parties stay together, because that is how a family arrives at a door.
 */
export default async function EventRosterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ church?: string }>;
}) {
  const { id } = await params;
  const { church } = await searchParams;
  const session = await requireSession(church);
  if (!canManageEvents(session)) redirect(`/?church=${session.tenantSlug}`);

  const found = await withTenant(
    {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      permissions: session.permissions,
    },
    async (tx) => {
      const event = await getEvent(tx, id);
      if (!event) return null;
      return {
        event,
        registrations: await listRegistrations(tx, event.id),
        questions: event.formId ? (await getForm(tx, event.formId))?.fields ?? [] : [],
      };
    },
  );
  if (!found) notFound();

  const { event, registrations, questions } = found;

  const when = [
    longDate(event.startsOn),
    event.startsAt ? readableTime(event.startsAt) : null,
  ].filter(Boolean).join(", ");

  const address = oneLineAddress({
    line1: event.addressLine1 ?? "",
    line2: event.addressLine2 ?? "",
    city: event.city ?? "",
    region: event.region ?? "",
    postalCode: event.postalCode ?? "",
    country: event.country ?? "",
  });

  return (
    <div className="bg-white p-8 text-black print:p-0">
      <AutoPrint />

      <h1 className="font-display text-[24px] leading-[30px]">{event.name}</h1>
      <p className="mt-1 text-[13px]">
        {[when, event.location, address].filter(Boolean).join(" · ")}
      </p>

      <table className="mt-6 w-full border-collapse text-[12px]">
        <thead>
          <tr className="border-b border-black text-left">
            <th className="py-1.5 pr-3 font-semibold">{t("event.registrant")}</th>
            <th className="py-1.5 pr-3 font-semibold">{t("person.phone")}</th>
            <th className="py-1.5 pr-3 font-semibold">{t("event.emergency")}</th>
            {questions.map((one) => (
              <th key={one.id} className="py-1.5 pr-3 font-semibold">{one.label}</th>
            ))}
            <th className="w-16 py-1.5 font-semibold">{t("event.arrived")}</th>
          </tr>
        </thead>
        <tbody>
          {registrations.map((one, index) => (
            <tr
              key={one.id}
              className={
                index > 0 && registrations[index - 1]!.bookingId !== one.bookingId
                  ? "border-t-2 border-black/40 break-inside-avoid"
                  : "border-t border-black/15 break-inside-avoid"
              }
            >
              <td className="py-2 pr-3 font-medium">
                {one.name}
                {one.state === "waiting" ? ` (${t("event.onWaitlist")})` : ""}
              </td>
              <td className="py-2 pr-3 tabular-nums">{one.phone ?? ""}</td>
              <td className="py-2 pr-3">
                {one.emergency.length === 0
                  ? t("event.noContacts")
                  : one.emergency
                      .map((c) => [c.name, c.phone].filter(Boolean).join(" "))
                      .join(", ")}
              </td>
              {questions.map((q) => (
                <td key={q.id} className="py-2 pr-3">{answerText(one.answers[q.id])}</td>
              ))}
              <td className="py-2">
                <span className="inline-block size-4 border border-black" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

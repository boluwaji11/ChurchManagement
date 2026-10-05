import type { NextRequest } from "next/server";
import {
  withTenant, getEvent, getForm, listRegistrations, toCsv, canManageEvents,
} from "@hearth/db";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * An answer as one cell. A list of choices reads as a list.
 *
 * A file question reads as a count: the key behind it is a path into a private
 * bucket and means nothing in a spreadsheet. The files themselves are opened
 * from the roster on screen.
 */
function cell(value: unknown, kind?: string): string {
  if (kind === "file") {
    return Array.isArray(value) && value.length > 0 ? String(value.length) : "";
  }
  if (value === true) return "yes";
  if (value === false || value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

/**
 * R14.12. The attendee list, as a file.
 *
 * A download rather than a server action, because the result is a file. One row
 * per person with the questions as columns, which is what gets printed, taped
 * to a clipboard, and handed to whoever is on the door.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const church = request.nextUrl.searchParams.get("church") ?? undefined;
  const session = await requireSession(church);
  if (!canManageEvents(session)) return new Response("", { status: 403 });

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
  if (!found) return new Response("", { status: 404 });

  const { event, registrations, questions } = found;

  const csv = toCsv(
    registrations.map((one) => ({
      Name: one.name,
      Email: one.email ?? "",
      Phone: one.phone ?? "",
      Status: one.state,
      Registered: one.registeredAt.slice(0, 10),
      Booking: one.bookingId,
      "Emergency contact": one.emergency
        .map((c) => [c.name, c.phone].filter(Boolean).join(" "))
        .join("; "),
      ...Object.fromEntries(questions.map((q) => [q.label, cell(one.answers[q.id], q.kind)])),
    })),
    [
      "Name", "Email", "Phone", "Status", "Registered", "Booking", "Emergency contact",
      ...questions.map((q) => q.label),
    ],
  );

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${event.slug}-registrations.csv"`,
      "cache-control": "no-store",
    },
  });
}

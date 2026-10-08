import {
  Document, Packer, Paragraph, TextRun, AlignmentType, PageBreak,
} from "docx";
import {
  withTenant, postalRows, resolveList, listPeople, getChurch, canEditPeople,
} from "@connectapp/db";
import { merge } from "@connectapp/ui";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { longDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

/** R16.12. How many letters one run will write. */
const CAP = 500;

/**
 * R16.12. The letters as a Word file.
 *
 * Printing is one thing a church does with these and keeping them is another:
 * a secretary adds a signature, a treasurer files the year's appeal, somebody
 * emails the lot to the print shop down the road. Word rather than a PDF
 * because all three of those start with changing something.
 *
 * The merge runs here as well as on the printed page, from the same function,
 * so the file and the paper cannot drift apart.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const session = await requireSession(url.searchParams.get("church") ?? undefined);
  if (!canEditPeople(session)) return new Response("", { status: 403 });

  const body = url.searchParams.get("body") ?? "";
  const each = url.searchParams.get("each") === "person" ? "person" : "household";
  const list = url.searchParams.get("list");
  const ids = url.searchParams.get("ids");

  const read = await withTenant(
    {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      permissions: session.permissions,
    },
    async (tx) => {
      const profile = await getChurch(tx, session.tenantId);

      const rows = ids
        ? await postalRows(tx, { memberIds: ids.split(",").filter(Boolean).slice(0, 40), each })
        : list
          ? await (async () => {
              const held = await resolveList(tx, list);
              if (!held) return [];
              const who = held.kind === "static"
                ? held.ids ?? []
                : (await listPeople(tx, { ...(held.rule ?? {}) } as never)).map((one) => one.id);
              return postalRows(tx, { memberIds: who, each });
            })()
          : await postalRows(tx, { each });

      return { profile, rows: rows.slice(0, CAP) };
    },
  );

  const today = longDate(churchNow(read.profile?.timezone ?? "America/Chicago").date);
  const where = [
    read.profile?.addressLine1,
    read.profile?.addressLine2,
    read.profile?.city,
    [read.profile?.region, read.profile?.postalCode].filter(Boolean).join(" "),
  ].filter(Boolean).join(", ");

  const line = (text: string, options: { bold?: boolean; size?: number; after?: number } = {}) =>
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: options.after ?? 0 },
      children: [new TextRun({ text, bold: options.bold, size: options.size ?? 22 })],
    });

  const children = read.rows.flatMap((one, at) => {
    const letter = merge(body, {
      name: one.name,
      address: one.lines.join(", "),
      church: session.tenantName,
      today,
      from: session.displayName,
    });

    return [
      line(session.tenantName, { bold: true, size: 28 }),
      ...(where ? [line(where, { size: 19 })] : []),
      ...(read.profile?.phone || read.profile?.email
        ? [line([read.profile?.phone, read.profile?.email].filter(Boolean).join("  ·  "), { size: 19, after: 480 })]
        : [line("", { after: 480 })]),

      line(today, { after: 360 }),

      line(one.name),
      ...one.lines.map((l) => line(l)),
      line("", { after: 360 }),

      // A blank line in what the church typed is a blank paragraph here.
      ...letter.split("\n").map((l) => line(l, { after: 120 })),

      // Every letter but the last starts a fresh page.
      ...(at === read.rows.length - 1
        ? []
        : [new Paragraph({ children: [new PageBreak()] })]),
    ];
  });

  const file = await Packer.toBuffer(
    new Document({ sections: [{ properties: {}, children }] }),
  );

  return new Response(new Uint8Array(file), {
    headers: {
      "content-type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "content-disposition": 'attachment; filename="letters.docx"',
    },
  });
}

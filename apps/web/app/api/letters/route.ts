import {
  Document, Packer, Paragraph, TextRun, AlignmentType, PageBreak,
  BorderStyle, ImageRun,
} from "docx";
import {
  withTenant, postalRows, resolveList, listPeople, getChurch, canEditPeople,
} from "@connectapp/db";
import { merge, LETTER_FACE, faceOf, sizeOf } from "@connectapp/ui";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { supabaseServer } from "@/lib/supabase/server";
import { localeFor } from "@connectapp/i18n";

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
  /* R16.12. The typeface the church chose, named so the file and the paper
     are set the same way. */
  const face = LETTER_FACE[faceOf(url.searchParams.get("font"))].name;
  /* Word counts in half points, so eleven point is twenty two. */
  const point = sizeOf(url.searchParams.get("size")) * 2;

  /*
   * R16.12. The file is named after the mailer, because a church that writes
   * four of these a year ends up with letters.docx, letters (1).docx and no
   * way to tell the carol service from the gift day.
   */
  const named = (url.searchParams.get("name") ?? "")
    .replace(/[^\p{L}\p{N} _-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  const filename = `${named || "letters"}.docx`;

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

  /*
   * R22.8. The church's own way of writing a date.
   *
   * `longDate` reads a per-request store the printed page has and an API
   * route does not, so the file said "8 October 2026" where the paper said
   * "October 8, 2026". The country decides it here, which both of them agree
   * on.
   */
  const when = churchNow(read.profile?.timezone ?? "America/Chicago").date;
  const today = new Date(`${when}T00:00:00`).toLocaleDateString(
    localeFor(read.profile?.country),
    { day: "numeric", month: "long", year: "numeric" },
  );
  const where = [
    read.profile?.addressLine1,
    read.profile?.addressLine2,
    read.profile?.city,
    [read.profile?.region, read.profile?.postalCode].filter(Boolean).join(" "),
  ].filter(Boolean).join(", ");

  const line = (
    text: string,
    options: { bold?: boolean; size?: number; after?: number; right?: boolean } = {},
  ) =>
    new Paragraph({
      alignment: options.right ? AlignmentType.RIGHT : AlignmentType.LEFT,
      spacing: { after: options.after ?? 0 },
      children: [new TextRun({ text, bold: options.bold, size: options.size ?? point })],
    });

  /*
   * R16.12. The small markdown the writer is offered, as Word runs.
   *
   * Bold, italic and a bullet, which is what the editor can make. A link
   * keeps its words and drops its address: a printed letter cannot be
   * pressed, and "the rota (https://...)" is how a sentence stops reading
   * like one.
   */
  const INLINE = /(\*\*([^*]+)\*\*)|(_([^_]+)_)|(\[([^\]]+)\]\(([^)\s]+)\))/g;

  const runs = (text: string) => {
    const out: TextRun[] = [];
    let at = 0;
    for (const m of text.matchAll(INLINE)) {
      const start = m.index!;
      if (start > at) out.push(new TextRun({ text: text.slice(at, start), size: point }));
      if (m[2] !== undefined) out.push(new TextRun({ text: m[2], bold: true, size: point }));
      else if (m[4] !== undefined) out.push(new TextRun({ text: m[4], italics: true, size: point }));
      else if (m[6] !== undefined) out.push(new TextRun({ text: m[6], size: point }));
      at = start + m[0].length;
    }
    if (at < text.length) out.push(new TextRun({ text: text.slice(at), size: point }));
    return out.length > 0 ? out : [new TextRun({ text: "", size: point })];
  };

  const written = (markdown: string) =>
    markdown.split("\n").map((raw) => {
      // R16.12. Lines somebody set in carry a tab each.
      const steps = /^\t+/.exec(raw)?.[0].length ?? 0;
      const flat = raw.slice(steps);
      const bullet = /^\s*[-*]\s+/.exec(flat);
      const numbered = /^\s*\d+[.)]\s+/.exec(flat);
      const text = flat.slice(bullet?.[0].length ?? numbered?.[0].length ?? 0);

      return new Paragraph({
        alignment: AlignmentType.LEFT,
        /* A line is a line and a blank line is a blank line, the same as the
           box it was typed in and the page it prints on. */
        spacing: { after: 0 },
        ...(steps > 0 ? { indent: { left: 360 * steps } } : {}),
        ...(bullet ? { bullet: { level: 0 } } : {}),
        ...(numbered ? { numbering: undefined, bullet: { level: 0 } } : {}),
        children: runs(text),
      });
    });

  /*
   * R1.1. The church's mark, as bytes, because a Word file carries its own
   * pictures rather than pointing at one. Fetched once for the whole run.
   */
  const mark = await (async () => {
    if (!read.profile?.logoKey) return null;
    try {
      const supabase = await supabaseServer();
      const signed = await supabase.storage
        .from("church")
        .createSignedUrl(read.profile.logoKey, 600);
      if (!signed.data?.signedUrl) return null;
      const got = await fetch(signed.data.signedUrl);
      if (!got.ok) return null;
      return new Uint8Array(await got.arrayBuffer());
    } catch {
      // A letter without the mark is still a letter.
      return null;
    }
  })();

  /** The hairline under the letterhead, which a paragraph carries as a border. */
  const rule = () =>
    new Paragraph({
      spacing: { before: 120, after: 360 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF", space: 6 },
      },
      children: [new TextRun({ text: "", size: 2 })],
    });

  const children = read.rows.flatMap((one, at) => {
    const letter = merge(body, {
      first: one.first,
      name: one.name,
      address: one.lines.join(", "),
      church: session.tenantName,
      today,
      from: session.displayName,
      phone: read.profile?.phone ?? "",
      email: read.profile?.email ?? "",
      website: read.profile?.website ?? "",
    });

    return [
      ...(mark
        ? [new Paragraph({
            spacing: { after: 60 },
            children: [new ImageRun({
              type: "png",
              data: mark,
              transformation: { width: 64, height: 64 },
            })],
          })]
        : []),
      line(session.tenantName, { bold: true, size: 28 }),
      ...(where ? [line(where, { size: 19 })] : []),
      ...(read.profile?.phone || read.profile?.email
        ? [line([read.profile?.phone, read.profile?.email].filter(Boolean).join("  ·  "), { size: 19, after: 480 })]
        : []),

      rule(),

      // Who it is going to on the right, the date under it on the left.
      line(one.name, { right: true, bold: true }),
      ...one.lines.map((l) => line(l, { right: true })),
      line("", { after: 240 }),

      line(today, { after: 360 }),

      ...written(letter),

      // Every letter but the last starts a fresh page.
      ...(at === read.rows.length - 1
        ? []
        : [new Paragraph({ children: [new PageBreak()] })]),
    ];
  });

  const file = await Packer.toBuffer(
    new Document({
      // Said once for the whole document rather than on every run in it.
      styles: { default: { document: { run: { font: face, size: point } } } },
      sections: [{ properties: {}, children }],
    }),
  );

  return new Response(new Uint8Array(file), {
    headers: {
      "content-type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}

import { redirect } from "next/navigation";
import {
  withTenant, postalRows, resolveList, listPeople, canEditPeople,
} from "@connectapp/db";
import { PAPER, PAPERS, perPage, paperCss, type PaperStock } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { AutoPrint } from "../../../checkin/rooms/print/auto-print";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/**
 * R16.12. How many ticked members an address will carry.
 *
 * A uuid is 36 characters and browsers give up somewhere past two thousand.
 * Past this a church saves the selection as a list and posts to that, which
 * is the better habit anyway.
 */
const PICKED_CAP = 40;

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  return tabMetadata(t("post.title"), church);
}

/**
 * R16.12. Mailing labels, on the sheets a church already owns.
 *
 * One label a household, because an address belongs to a family: four labels
 * for four people at one address is three wasted labels and a family
 * wondering why the church wrote to them four times.
 *
 * The grid is laid out in millimetres from the paper's edge, the way the
 * manufacturer measures it, rather than in a flow the browser decides. A
 * label sheet is the one thing here where a millimetre is visible on every
 * row of every page, and the church finds out after the box has gone through
 * the printer.
 */
export default async function PrintLabelsPage({
  searchParams,
}: {
  searchParams: Promise<{
    church?: string; sheet?: string; list?: string; skip?: string; ids?: string;
    each?: string;
  }>;
}) {
  const params = await searchParams;
  const session = await requireSession(params.church);

  /* A sheet with no shell around it, so a refusal has nowhere to sit. Back to
     the screen it was asked for from, which says why. */
  if (!canEditPeople(session)) {
    redirect(`/members?church=${session.tenantSlug}`);
  }

  const sheet: PaperStock = (PAPERS as readonly string[]).includes(params.sheet ?? "")
    ? (params.sheet as PaperStock)
    : "envelope";
  const shape = PAPER[sheet];

  const rows = await withTenant(
    {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      permissions: session.permissions,
    },
    async (tx) => {
      /* R16.12. Whoever was ticked in the directory, which is where the
         search and the filters already are. A long selection goes on a list
         first; this carries the handful somebody picked off a screen. */
      const each = params.each === "person" ? "person" : "household";

      if (params.ids) {
        const ids = params.ids.split(",").filter(Boolean).slice(0, PICKED_CAP);
        return postalRows(tx, { memberIds: ids, each });
      }

      if (!params.list) return postalRows(tx, { each });

      /* R1.14. A saved list, which is how a church posts to the people it
         narrowed down rather than to everybody. */
      const held = await resolveList(tx, params.list);
      if (!held) return [];

      const ids = held.kind === "static"
        ? held.ids ?? []
        : (await listPeople(tx, { ...(held.rule ?? {}) } as never)).map((one) => one.id);

      return postalRows(tx, { memberIds: ids, each });
    },
  );

  /*
   * R16.12. Starting part way down a sheet that has already been used.
   *
   * A church prints twelve labels off a sheet of thirty and keeps the rest.
   * Without this the next run puts twelve labels on the bit that is already
   * gone, and the sheet is wasted.
   */
  const skip = Math.max(0, Math.min(perPage(sheet) - 1, Number(params.skip) || 0));
  const cells: (typeof rows[number] | null)[] = [
    ...Array.from({ length: skip }, () => null),
    ...rows,
  ];

  const pages: (typeof cells)[] = [];
  for (let at = 0; at < cells.length; at += perPage(sheet)) {
    pages.push(cells.slice(at, at + perPage(sheet)));
  }

  return (
    <main className="min-h-dvh bg-white text-black">
      <AutoPrint />
      <style>{paperCss(sheet)}</style>

      {pages.length === 0 ? (
        <p className="px-10 py-9 text-[13pt]">{t("post.none")}</p>
      ) : null}

      {pages.map((page, at) => (
        <section
          key={at}
          /* Each sheet is its own page, and the last one does not drag a
             blank page after it. */
          className={at === pages.length - 1 ? "relative" : "relative break-after-page"}
          style={{ width: `${shape.page.split(" ")[0]}`, height: `${shape.page.split(" ")[1]}` }}
        >
          {page.map((one, cell) => {
            if (!one) return null;
            const column = cell % shape.columns;
            const row = Math.floor(cell / shape.columns);

            return (
              <div
                key={one.householdId}
                className="absolute flex flex-col justify-center overflow-hidden"
                style={{
                  left: `${shape.marginLeft + column * shape.pitchX}mm`,
                  top: `${shape.marginTop + row * shape.pitchY}mm`,
                  width: `${shape.width}mm`,
                  height: `${shape.height}mm`,
                  paddingLeft: "3mm",
                  paddingRight: "3mm",
                }}
              >
                <span className="text-[10pt] font-semibold leading-[1.25]">{one.name}</span>
                {one.lines.map((line) => (
                  <span key={line} className="text-[9.5pt] leading-[1.25]">{line}</span>
                ))}
              </div>
            );
          })}
        </section>
      ))}
    </main>
  );
}

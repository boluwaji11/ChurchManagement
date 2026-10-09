import type { NextRequest } from "next/server";
import PptxGenJS from "pptxgenjs";
import { withTenant, getChurch } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { churchLogoUrl } from "@/lib/church-logo";
import { hueHex } from "@/lib/hue-hex";
import { refused } from "@/lib/refuse";
import { logoData, SLIDE, MARGIN, TITLE_H, BODY, FOOT } from "@/lib/deck";
import { windowOf } from "../frame";
import { sheetFor, isBuiltIn, mayRead, type SheetTable } from "../sheets";

export const dynamic = "force-dynamic";

/**
 * R18.10. A built-in report as a deck.
 *
 * The same three formats the built reports have, so a church that has learned
 * one report has learned all of them. The series is a real PowerPoint chart
 * rather than a picture of one: the numbers are still numbers when a treasurer
 * opens it, and they can restyle it for a board pack.
 *
 * A table longer than one slide carries on over the next, because a report of
 * four hundred visitors is a report somebody reads rather than one slide with
 * four hundred rows crushed into it.
 */
const PER_SLIDE = 16;

export async function GET(request: NextRequest) {
  const church = request.nextUrl.searchParams.get("church") ?? undefined;
  const session = await requireSession(church);
  const report = request.nextUrl.searchParams.get("report");
  if (!isBuiltIn(report)) return new Response("", { status: 404 });

  /* R1.5. The giving report asks for the permission to read amounts. */
  if (!mayRead(report, session)) {
    return refused(session.role, report === "giving" ? "manageGiving" : "buildReports");
  }

  const window = windowOf(request.nextUrl.searchParams.get("days") ?? undefined);
  const sheet = await sheetFor(report, session, window);
  const hue = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => (await getChurch(tx, session.tenantId))?.brandHue ?? "indigo",
  );
  const logo = await logoData(await churchLogoUrl(session.tenantId, session.role));

  const deck = new PptxGenJS();
  deck.defineLayout({ name: "CHURCH", width: SLIDE.w, height: SLIDE.h });
  deck.layout = "CHURCH";
  deck.title = sheet.title;
  deck.company = session.tenantName;

  /** Every slide carries the church's mark and name: one gets shown on its own. */
  const slideWith = (heading: string) => {
    const slide = deck.addSlide();
    const titleAt = logo ? MARGIN + 0.75 : MARGIN;
    if (logo) {
      slide.addImage({
        data: logo, x: MARGIN, y: MARGIN - 0.05, w: 0.6, h: 0.6,
        sizing: { type: "contain", w: 0.6, h: 0.6 },
      });
    }
    slide.addText(heading, {
      x: titleAt, y: MARGIN - 0.05, w: SLIDE.w - titleAt - MARGIN, h: TITLE_H,
      fontSize: 24, bold: true, color: "1A1A1A", valign: "middle",
    });
    slide.addText(
      [
        { text: session.tenantName, options: { color: "6B6B6B" } },
        { text: `   ${sheet.window}   ${sheet.asked}`, options: { color: "6B6B6B" } },
      ],
      { ...FOOT, fontSize: 11, valign: "middle" },
    );
    return slide;
  };

  // The cover: whose this is, what it is, and when it was run.
  const cover = deck.addSlide();
  cover.addShape(deck.ShapeType.rect, {
    x: 0, y: 0, w: SLIDE.w, h: 0.22, fill: { color: hueHex(hue) },
  });
  if (logo) {
    cover.addImage({
      data: logo, x: MARGIN, y: 1.5, w: 1.1, h: 1.1,
      sizing: { type: "contain", w: 1.1, h: 1.1 },
    });
  }
  cover.addText(session.tenantName, {
    x: MARGIN, y: logo ? 2.8 : 2.4, w: SLIDE.w - MARGIN * 2, h: 0.5,
    fontSize: 18, bold: true, color: hueHex(hue, "700"),
  });
  cover.addText(sheet.title, {
    x: MARGIN, y: logo ? 3.3 : 2.9, w: SLIDE.w - MARGIN * 2, h: 1.1,
    fontSize: 40, bold: true, color: "1A1A1A",
  });
  cover.addText(`${sheet.window}   ${sheet.asked}`, {
    x: MARGIN, y: logo ? 4.4 : 4.0, w: SLIDE.w - MARGIN * 2, h: 0.4,
    fontSize: 14, color: "6B6B6B",
  });

  // The numbers across the top of the screen, as boxes on one slide.
  if (sheet.figures.length > 0) {
    const slide = slideWith(sheet.title);
    const gap = 0.25;
    const each = (BODY.w - gap * (sheet.figures.length - 1)) / sheet.figures.length;
    sheet.figures.forEach((one, at) => {
      const x = BODY.x + at * (each + gap);
      slide.addShape(deck.ShapeType.rect, {
        x, y: BODY.y, w: each, h: 2.1,
        fill: { color: "FFFFFF" }, line: { color: "D9D4CC", width: 1 },
      });
      slide.addText(one.label, {
        x: x + 0.2, y: BODY.y + 0.15, w: each - 0.4, h: 0.35,
        fontSize: 11, bold: true, color: "6B6B6B",
      });
      slide.addText(one.value, {
        x: x + 0.2, y: BODY.y + 0.5, w: each - 0.4, h: 0.9,
        fontSize: 36, bold: true, color: hueHex(hue, "700"),
      });
      if (one.sub) {
        slide.addText(one.sub, {
          x: x + 0.2, y: BODY.y + 1.4, w: each - 0.4, h: 0.6,
          fontSize: 10, color: "6B6B6B",
        });
      }
    });
  }

  for (const block of sheet.blocks) {
    if (block.kind === "series") {
      if (block.points.length === 0) continue;
      const slide = slideWith(block.title);
      slide.addChart(
        deck.ChartType.line,
        [{
          name: block.name,
          labels: block.points.map((one) => one.label),
          values: block.points.map((one) => one.value),
        }],
        {
          ...BODY,
          chartColors: [hueHex(hue)],
          lineSmooth: false,
          showLegend: false,
          showValue: false,
          catAxisLabelFontSize: 9,
          valAxisLabelFontSize: 10,
        },
      );
      continue;
    }

    drawTable(slideWith, block);
  }

  const body = (await deck.write({ outputType: "nodebuffer" })) as Buffer;

  return new Response(new Uint8Array(body), {
    headers: {
      "content-type":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "content-disposition":
        `attachment; filename="${session.tenantSlug}-${report}.pptx"`,
      "cache-control": "no-store",
    },
  });
}

/** A table across as many slides as its rows need. */
function drawTable(
  slideWith: (heading: string) => PptxGenJS.Slide,
  one: SheetTable,
) {
  if (one.rows.length === 0) {
    const slide = slideWith(one.title);
    slide.addText(t("reports.none"), { ...BODY, fontSize: 14, color: "6B6B6B" });
    return;
  }

  const pages = Math.ceil(one.rows.length / PER_SLIDE);
  for (let page = 0; page < pages; page += 1) {
    const slide = slideWith(
      pages === 1 ? one.title : `${one.title} (${page + 1}/${pages})`,
    );
    const head = one.columns.map((column, at) => ({
      text: column,
      options: {
        bold: true,
        color: "FFFFFF",
        fill: { color: "3F3B36" },
        align: (one.numeric[at] ? "right" : "left") as "right" | "left",
      },
    }));
    const rows = one.rows
      .slice(page * PER_SLIDE, (page + 1) * PER_SLIDE)
      .map((row) =>
        row.map((cell, at) => ({
          text: cell,
          options: { align: (one.numeric[at] ? "right" : "left") as "right" | "left" },
        })));

    slide.addTable([head, ...rows], {
      ...BODY,
      fontSize: 11,
      border: { type: "solid", color: "E6E1D9", pt: 0.5 },
      autoPage: false,
    });
  }
}

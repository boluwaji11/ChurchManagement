import type { NextRequest } from "next/server";
import PptxGenJS from "pptxgenjs";
import {
  withTenant, getChurch, getSavedReport, runReport, canEditPeople, canReadIncidents,
  CHART_HUES, SCREEN_LIMIT,
  type ReportResult, type ReportTile,
} from "@hearth/db";
import { t } from "@hearth/i18n";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { churchLogoUrl } from "@/lib/church-logo";
import { hueHex } from "@/lib/hue-hex";

export const dynamic = "force-dynamic";

/** Booleans come back from Postgres as words nobody wants to read on a slide. */
const read = (value: string): string => {
  if (value === "true") return t("report.yes");
  if (value === "false") return t("report.no");
  return value === "" ? t("report.blank") : value;
};

/** What a visual is called when nobody has named it. */
const nameOf = (tile: ReportTile): string =>
  tile.title
  || (tile.groupBy
    ? t("report.by", { field: t(`report.field.${tile.groupBy}` as never) })
    : t(`report.subject.${tile.subject}` as never));

/** A colour per series: the one the report set, or the spectrum from its lead. */
function palette(tile: ReportTile, many: number): string[] {
  const at = CHART_HUES.indexOf(tile.look.hue);
  const from = at < 0 ? 0 : at;
  return Array.from({ length: Math.max(1, many) }, (_, i) =>
    hueHex(tile.look.hues[i] ?? CHART_HUES[(from + i) % CHART_HUES.length]!));
}

/**
 * The slide, in inches, and everything else measured off it.
 *
 * Declared rather than taken from a named layout: pptxgenjs reads LAYOUT_16x9
 * as ten inches by five and five eighths, so a body sized for a widescreen deck
 * ran off the edge of it. Every box below comes out of these numbers, so the
 * chart fits whatever the slide is.
 */
const SLIDE = { w: 13.333, h: 7.5 } as const;
const MARGIN = 0.6;
/** Where the visual's name sits, and how much room the footer keeps. */
const TITLE_H = 0.7;
const FOOT_H = 0.45;

const BODY = {
  x: MARGIN,
  y: MARGIN + TITLE_H,
  w: SLIDE.w - MARGIN * 2,
  h: SLIDE.h - MARGIN * 2 - TITLE_H - FOOT_H,
} as const;

/** The line under the body, for a total or a row count. */
const FOOT = {
  x: MARGIN,
  y: SLIDE.h - MARGIN - FOOT_H,
  w: SLIDE.w - MARGIN * 2,
  h: FOOT_H,
} as const;

/** The church's logo, fetched once and carried into the deck as bytes. */
async function logoData(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const answer = await fetch(url);
    if (!answer.ok) return null;
    const type = answer.headers.get("content-type") ?? "image/png";
    const bytes = Buffer.from(await answer.arrayBuffer());
    // A logo past this is a logo somebody uploaded at print resolution, and it
    // would make the deck slower to send than it is to read.
    if (bytes.byteLength > 2_000_000) return null;
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * R18.10. A built report as a deck.
 *
 * One slide a visual, drawn as a real PowerPoint chart rather than a picture of
 * one, so the numbers are still numbers when somebody opens it: they can
 * restyle it, drop it into a board pack, and read the data behind it.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const church = request.nextUrl.searchParams.get("church") ?? undefined;
  const session = await requireSession(church);
  if (!canEditPeople(session) && !canReadIncidents(session)) {
    return new Response("", { status: 403 });
  }

  const found = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      const saved = await getSavedReport(tx, id);
      if (!saved) return null;

      const profile = await getChurch(tx, session.tenantId);
      const answers: Record<string, ReportResult> = {};
      for (const tile of saved.spec.tiles) {
        answers[tile.id] = await runReport(tx, tile, { limit: SCREEN_LIMIT });
      }
      return {
        saved,
        answers,
        when: churchNow(profile?.timezone ?? "America/Chicago"),
        hue: profile?.brandHue ?? "indigo",
      };
    },
  );

  if (!found) return new Response("", { status: 404 });
  const { saved, answers, when, hue } = found;

  const logo = await logoData(await churchLogoUrl(session.tenantId, session.role));

  const deck = new PptxGenJS();
  deck.defineLayout({ name: "CHURCH", width: SLIDE.w, height: SLIDE.h });
  deck.layout = "CHURCH";
  deck.title = saved.name;
  deck.company = session.tenantName;

  // The cover: whose this is, what it is, and when it was run.
  const cover = deck.addSlide();
  cover.addShape(deck.ShapeType.rect, {
    x: 0, y: 0, w: SLIDE.w, h: 0.22, fill: { color: hueHex(hue) },
  });
  if (logo) {
    cover.addImage({ data: logo, x: MARGIN, y: 1.5, w: 1.1, h: 1.1, sizing: { type: "contain", w: 1.1, h: 1.1 } });
  }
  cover.addText(session.tenantName, {
    x: MARGIN, y: logo ? 2.8 : 2.4, w: SLIDE.w - MARGIN * 2, h: 0.5,
    fontSize: 18, bold: true, color: hueHex(hue, "700"),
  });
  cover.addText(saved.name, {
    x: MARGIN, y: logo ? 3.3 : 2.9, w: SLIDE.w - MARGIN * 2, h: 1.1,
    fontSize: 40, bold: true, color: "1A1A1A",
  });
  cover.addText(when.date, {
    x: MARGIN, y: logo ? 4.4 : 4.0, w: SLIDE.w - MARGIN * 2, h: 0.4,
    fontSize: 14, color: "6B6B6B",
  });

  for (const tile of saved.spec.tiles) {
    const result = answers[tile.id];
    const slide = deck.addSlide();

    // The church's mark and name on every slide, because a slide gets pulled
    // out of a deck and shown on its own.
    const titleAt = logo ? MARGIN + 0.75 : MARGIN;
    if (logo) {
      slide.addImage({
        data: logo, x: MARGIN, y: MARGIN - 0.05, w: 0.6, h: 0.6,
        sizing: { type: "contain", w: 0.6, h: 0.6 },
      });
    }
    slide.addText(nameOf(tile), {
      x: titleAt, y: MARGIN - 0.05, w: SLIDE.w - titleAt - MARGIN, h: TITLE_H,
      fontSize: 24, bold: true, color: "1A1A1A", valign: "middle",
    });

    if (!result || result.rows.length === 0) {
      slide.addText(t("report.nothingMatches"), {
        ...BODY, fontSize: 14, color: "6B6B6B",
      });
    } else {
      drawTile(deck, slide, tile, result);
    }

    const total = result && result.total !== null
      ? t("report.totalIs", { total: result.total.toLocaleString() })
      : "";
    slide.addText(
      [
        { text: session.tenantName, options: { color: "6B6B6B" } },
        { text: total ? `   ${total}` : "", options: { color: "6B6B6B" } },
      ],
      { ...FOOT, fontSize: 11, valign: "middle" },
    );
  }

  const file = saved.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const body = (await deck.write({ outputType: "nodebuffer" })) as Buffer;

  return new Response(new Uint8Array(body), {
    headers: {
      "content-type":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "content-disposition":
        `attachment; filename="${session.tenantSlug}-${file || "report"}.pptx"`,
      "cache-control": "no-store",
    },
  });
}

/** One visual, drawn the way the report asked for it. */
function drawTile(
  deck: PptxGenJS,
  slide: PptxGenJS.Slide,
  tile: ReportTile,
  result: ReportResult,
) {
  const look = tile.look;
  const measure = t("report.measure.value");

  // A single value is a single value. Nothing is gained by charting one number.
  if (tile.view === "number") {
    const total = result.chart
      ? result.chart.reduce((all, one) => all + one.value, 0)
      : result.rows.length;
    slide.addText(total.toLocaleString(), {
      ...BODY, fontSize: 96, bold: true, color: hueHex(look.hues[0] ?? look.hue),
      align: "center", valign: "middle",
    });
    return;
  }

  // Two dimensions: one column per answer, split into its series.
  if (result.grid && (tile.view === "bar" || tile.view === "stacked")) {
    const colours = palette(tile, result.grid.series.length);
    slide.addChart(
      deck.ChartType.bar,
      result.grid.series.map((one) => ({
        name: read(one.name),
        labels: result.grid!.labels.map(read),
        values: one.values,
      })),
      {
        ...BODY,
        barDir: "col",
        barGrouping: tile.view === "stacked" ? "stacked" : "clustered",
        chartColors: colours,
        ...common(tile),
      },
    );
    return;
  }

  const points = result.chart ?? [];
  if (points.length === 0) {
    drawTable(slide, result);
    return;
  }

  const labels = points.map((one) => read(one.label));
  const values = points.map((one) => one.value);
  const one = [{ name: measure, labels, values }];
  const colours = palette(tile, points.length);

  if (tile.view === "donut") {
    slide.addChart(deck.ChartType.doughnut, one, {
      ...BODY, chartColors: colours, holeSize: 55, ...common(tile),
    });
    return;
  }

  if (tile.view === "line" || tile.view === "area") {
    slide.addChart(
      tile.view === "area" ? deck.ChartType.area : deck.ChartType.line,
      one,
      { ...BODY, chartColors: [colours[0]!], ...common(tile) },
    );
    return;
  }

  if (tile.view === "bar" || tile.view === "rows" || tile.view === "stacked") {
    slide.addChart(deck.ChartType.bar, one, {
      ...BODY,
      // The one axis runs along the x or the y, which is what the view picks.
      barDir: tile.view === "rows" ? "bar" : "col",
      barGrouping: tile.view === "stacked" ? "stacked" : "clustered",
      chartColors: colours,
      ...common(tile),
      // One series coloured per answer only reads with the key off.
      showLegend: tile.view === "stacked" ? tile.look.legend : false,
    });
    return;
  }

  drawTable(slide, result);
}

/** The format options a PowerPoint chart shares with the one on screen. */
const common = (tile: ReportTile) => ({
  showLegend: tile.look.legend,
  legendPos: ({ top: "t", bottom: "b", left: "l", right: "r" } as const)[tile.look.legendAt],
  showValue: tile.look.labels,
  showPercent: tile.look.labels && tile.look.labelKind !== "value",
  catAxisTitle: tile.look.categoryTitle || undefined,
  showCatAxisTitle: Boolean(tile.look.categoryTitle),
  valAxisTitle: tile.look.valueTitle || undefined,
  showValAxisTitle: Boolean(tile.look.valueTitle),
  valGridLine: tile.look.grid ? { style: "solid" as const, color: "E6E2DC" } : { style: "none" as const },
  catAxisHidden: !tile.look.categoryAxis,
  valAxisHidden: !tile.look.valueAxis,
  dataLabelFontSize: 10,
  catAxisLabelFontSize: 10,
  valAxisLabelFontSize: 10,
});

/** A list, as a table somebody can read and re-sort. */
function drawTable(slide: PptxGenJS.Slide, result: ReportResult) {
  // Past this many rows a slide is a wall, so the deck carries the first page
  // and the CSV carries the rest.
  const ROWS = 14;
  const head = result.columns.map((one) => ({
    text: t(one.label as never),
    options: { bold: true, color: "FFFFFF", fill: { color: "3F3F46" } },
  }));
  const body = result.rows.slice(0, ROWS).map((row) =>
    row.map((value) => ({ text: read(value), options: {} })));

  slide.addTable([head, ...body], {
    ...BODY,
    fontSize: 11,
    border: { type: "solid", color: "E6E2DC", pt: 1 },
    autoPage: false,
  });

  if (result.rows.length > ROWS) {
    slide.addText(
      t("pages.range", {
        first: "1",
        upto: String(ROWS),
        matching: String(result.rows.length),
      }),
      { ...FOOT, align: "right", fontSize: 11, color: "6B6B6B" },
    );
  }
}

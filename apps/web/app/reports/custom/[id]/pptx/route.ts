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

/** A slide's worth of room under the title, in inches on a 16:9 deck. */
const BODY = { x: 0.6, y: 1.3, w: 12.1, h: 5.6 } as const;

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

  const deck = new PptxGenJS();
  deck.layout = "LAYOUT_16x9";
  deck.title = saved.name;
  deck.company = session.tenantName;

  // The cover: what this is, whose it is, and when it was run.
  const cover = deck.addSlide();
  cover.addShape(deck.ShapeType.rect, {
    x: 0, y: 0, w: 13.33, h: 0.22, fill: { color: hueHex(hue) },
  });
  cover.addText(saved.name, {
    x: 0.8, y: 2.4, w: 11.7, h: 1.1, fontSize: 40, bold: true, color: "1A1A1A",
  });
  cover.addText(`${session.tenantName}  ${when.date}`, {
    x: 0.8, y: 3.5, w: 11.7, h: 0.5, fontSize: 16, color: "6B6B6B",
  });

  for (const tile of saved.spec.tiles) {
    const result = answers[tile.id];
    const slide = deck.addSlide();
    slide.addText(nameOf(tile), {
      x: 0.6, y: 0.45, w: 12.1, h: 0.6, fontSize: 24, bold: true, color: "1A1A1A",
    });

    if (!result || result.rows.length === 0) {
      slide.addText(t("report.nothingMatches"), {
        ...BODY, fontSize: 14, color: "6B6B6B",
      });
      continue;
    }

    drawTile(deck, slide, tile, result);

    if (result.total !== null) {
      slide.addText(t("report.totalIs", { total: result.total.toLocaleString() }), {
        x: 0.6, y: 6.9, w: 12.1, h: 0.4, fontSize: 12, color: "6B6B6B",
      });
    }
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
      { x: 0.6, y: 6.9, w: 12.1, h: 0.4, fontSize: 11, color: "6B6B6B" },
    );
  }
}

import { HUES, HueTag, Badge } from "@connectapp/ui";
import { PageTitle, Section } from "@/components/section";

const RAMPS = {
  stone: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950],
  ink: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900],
  ember: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900],
};

const SEMANTIC = [
  "canvas", "surface", "sunken", "fg", "fg-muted", "fg-subtle",
  "line", "line-strong", "primary", "primary-fg", "primary-soft",
  "accent", "accent-fg", "accent-soft", "ring",
];

const ASSIGNMENTS: [string, string, string][] = [
  ["Check-in rooms", "teal", "Prints on the child's label. A volunteer says the teal room, which beats reading a name."],
  ["Teams", "violet", "Runs through the schedule grid, the plan, and the coverage dashboard."],
  ["Group types", "sky", "Drives group finder filters and the calendar."],
  ["Funds", "fern", "Every giving chart, so a treasurer reads it without a legend."],
  ["Ministries", "amber", "The only way a shared church calendar is ever legible."],
  ["Pipeline stages", "rose", "A warm to cool ramp, so progress reads as movement."],
];

export default function Colour() {
  return (
    <>
      <PageTitle
        title="Colour"
        lede="OKLCH throughout, for perceptually even ramps and predictable contrast. A warm canvas so the colour reads, and a spectrum assigned to things rather than sprinkled on them."
      />

      <Section title="Ramps" note="Warm stone for the canvas, ink for action, ember for warmth. Hue 75 keeps the neutrals warm and never blue-grey.">
        <div className="flex flex-col gap-4">
          {Object.entries(RAMPS).map(([name, steps]) => (
            <div key={name} className="flex flex-col gap-1.5">
              <p className="text-label text-fg-muted">{name}</p>
              <div className="flex overflow-hidden rounded-lg border border-line">
                {steps.map((s) => (
                  <div key={s} className="flex-1" title={`--${name}-${s}`}>
                    <div className="h-14" style={{ background: `var(--${name}-${s})` }} />
                    <p className="bg-surface py-1 text-center text-caption text-fg-subtle">{s}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="The spectrum"
        note="Eight hues at matched lightness and chroma, evenly spread, so any two sit together without clashing and none shouts. It was twelve, and twelve read as a paint chart: the extra four sat too close to their neighbours to tell apart at a glance, which is the only thing a hue is for. 100 tints an area, 500 is the identity, 700 is text-safe. Never 500 text on a light canvas."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {HUES.map((h) => (
            <div key={h} className="overflow-hidden rounded-lg border border-line bg-surface">
              <div className="flex">
                {["100", "500", "700", "900"].map((step) => (
                  <div key={step} className="h-12 flex-1" style={{ background: `var(--hue-${h}-${step})` }} />
                ))}
              </div>
              <div className="flex items-center justify-between gap-2 p-3">
                <span className="text-label text-fg">{h}</span>
                <HueTag hue={h}>Sample</HueTag>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="What each hue is for" note="Assigned automatically on creation, spread around the wheel for separation, and editable by the church, because the youth ministry will have opinions.">
        <div className="flex flex-col gap-2">
          {ASSIGNMENTS.map(([thing, hue, why]) => (
            <div key={thing} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-line bg-surface p-3">
              <HueTag hue={hue as never}>{thing}</HueTag>
              <span className="text-[length:var(--d-text-body)] text-fg-muted">{why}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Status" note="One meaning each. A spectrum hue never signals success or danger, and colour is never the only signal.">
        <div className="flex flex-wrap gap-2">
          <Badge tone="success">Accepted</Badge>
          <Badge tone="warning">Expiring soon</Badge>
          <Badge tone="danger">Declined</Badge>
          <Badge tone="info">Pending review</Badge>
          <Badge tone="critical">Allergy</Badge>
          <Badge tone="primary">Member</Badge>
          <Badge tone="accent">First visit</Badge>
          <Badge tone="neutral">Archived</Badge>
        </div>
      </Section>

      <Section title="Semantic tokens" note="Components reference only these. Changing a ramp must never require touching a component.">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {SEMANTIC.map((t) => (
            <div key={t} className="flex items-center gap-2.5 rounded-md border border-line bg-surface p-2">
              <span
                aria-hidden
                className="size-6 shrink-0 rounded border border-line-strong"
                style={{ background: `var(--${t})` }}
              />
              <code className="text-code text-fg-muted">--{t}</code>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

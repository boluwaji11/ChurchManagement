import Link from "next/link";
import { ArrowRight, Users, HandCoins, CalendarDays, HeartHandshake } from "lucide-react";
import { StatTile, Card, CardTitle, CardDescription, Badge, LIFT } from "@hearth/ui";
import { PageTitle, Section } from "@/components/section";

export default function Overview() {
  return (
    <>
      <PageTitle
        title="The design system"
        lede="Hearth replaces software churches pay for, so it has to look better than that software."
      />

      <Section
        title="Three surfaces, three densities"
        note="One system, one component implementation. Switch density in the header and every page on this site changes with it, including this one."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["Office", "Maria at a desk on a Tuesday. Dense, keyboard-first, calm.", "indigo"],
            ["Station", "Ruth at check-in, doors open, forty families queuing. Unmissable, zero ambiguity.", "rose"],
            ["Portal", "A member on a phone for four minutes a week. Warm, simple, app-like.", "teal"],
          ].map(([name, use, hue]) => (
            <Card key={name as string}>
              <div className="mb-2 flex items-center gap-2">
                <span
                  aria-hidden
                  className="size-2.5 rounded-full"
                  style={{ background: `var(--hue-${hue}-500)` }}
                />
                <CardTitle>{name}</CardTitle>
              </div>
              <CardDescription>{use}</CardDescription>
            </Card>
          ))}
        </div>
      </Section>

      <Section
        title="Colour does work, and then it stops"
        note="Tiles are quiet by default: a plain surface and one small keyed mark. A row of fully tinted tiles reads as decoration and the eye stops sorting them, so at most one is emphasised, and only when it needs to be seen first."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Attendance" value="184" hue="indigo" delta={6} caption="vs last week" icon={<Users className="size-4" />} />
          <StatTile label="Giving this month" value="$18,420" hue="fern" delta={12} caption="vs last month" icon={<HandCoins className="size-4" />} />
          <StatTile label="New members" value="7" hue="amber" delta={-14} caption="vs last month" icon={<HeartHandshake className="size-4" />} />
          <StatTile
            label="Serving gaps"
            value="3"
            hue="rose"
            emphasis="tint"
            caption="next 6 weeks, needs attention"
            icon={<CalendarDays className="size-4" />}
          />
        </div>
      </Section>

      <Section title="Sections">
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ["/design/colour", "Colour", "Ramps, the twelve-hue spectrum, semantic tokens, status."],
            ["/design/type", "Type", "Fraunces, Inter, and a mono chosen so 0 and O cannot be confused."],
            ["/design/space", "Space and depth", "Scale, radius, elevation. A hairline does the work."],
            ["/design/icons", "Icons", "Lucide, one concept to one glyph, sized by density."],
            ["/design/motion", "Motion", "Durations, easings, and what we refuse to animate."],
            ["/design/components", "Components", "Every component, every state, every density."],
            ["/design/station", "Station", "The hardest screen in church software."],
          ].map(([href, label, note]) => (
            <Link
              key={href as string}
              href={href as string}
              className={`group flex items-start justify-between gap-4 rounded-lg border border-line bg-surface p-4 shadow-sm ${LIFT}`}
            >
              <span className="flex flex-col gap-1">
                <span className="text-title text-fg">{label}</span>
                <span className="text-caption text-fg-muted">{note}</span>
              </span>
              <ArrowRight className="mt-0.5 size-4 shrink-0 text-fg-subtle transition-transform duration-fast ease-out group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </Section>

      <Section title="Rules that are not negotiable">
        <ul className="flex max-w-2xl flex-col gap-2 text-[length:var(--d-text-body)] text-fg-muted">
          {[
            "Body text is never lighter than 400 weight.",
            "4.5:1 contrast for body, 3:1 for UI boundaries, 7:1 on any station screen.",
            "Colour is never the only signal. Every status carries an icon or a label.",
            "The focus ring is never removed, in any state, for any reason.",
            "Reduced motion means no motion, not less.",
            "No icon-only controls at station density. A volunteer should never have to guess.",
          ].map((r) => (
            <li key={r} className="flex items-start gap-2.5">
              <Badge tone="neutral" className="mt-0.5 shrink-0">rule</Badge>
              {r}
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}

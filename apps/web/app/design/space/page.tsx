import { Card, CardTitle, CardDescription } from "@connectapp/ui";
import { PageTitle, Section } from "@/components/section";

/** The gallery is a tool for us, so it names itself plainly. */
export const metadata = { title: "Design · space" };

export default function Space() {
  return (
    <>
      <PageTitle
        title="Space and depth"
        lede="A 4px base, nothing off-scale. A hairline border does the work and the shadow only hints. No backdrop blur, ever."
      />

      <Section title="Space" note="Units of 4px. If a value is not on the scale, the layout is wrong rather than the scale.">
        <div className="flex flex-wrap items-end gap-4">
          {[1, 2, 3, 4, 6, 8, 12, 16].map((n) => (
            <div key={n} className="flex flex-col items-center gap-1.5">
              <div className="rounded bg-primary" style={{ width: n * 4, height: n * 4 }} />
              <code className="text-caption text-fg-subtle">{n}</code>
              <span className="text-caption text-fg-subtle">{n * 4}px</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Radius" note="Larger surfaces get larger radius. Inputs md, cards lg, dialogs xl. Pills for badges only, never for a primary button.">
        <div className="flex flex-wrap gap-4">
          {[["sm", "6px"], ["md", "10px"], ["lg", "14px"], ["xl", "20px"], ["full", "9999px"]].map(([name, v]) => (
            <div key={name as string} className="flex flex-col items-center gap-2">
              <div
                className="size-20 border border-line-strong bg-surface shadow-sm"
                style={{ borderRadius: `var(--radius-${name})` }}
              />
              <code className="text-caption text-fg-muted">{name}</code>
              <span className="text-caption text-fg-subtle">{v}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Elevation" note="Layered soft shadows plus a hairline. Glassmorphism reads as 2021, costs contrast, and drops frames on the seven year old tablet running check-in.">
        <div className="grid gap-4 sm:grid-cols-3">
          {[["sm", "Cards, inputs, resting surfaces"], ["md", "Popovers, dropdowns, hover lift"], ["lg", "Dialogs, sheets, anything over content"]].map(([name, use]) => (
            <div key={name as string} className="rounded-lg border border-line bg-surface p-4" style={{ boxShadow: `var(--shadow-${name})` }}>
              <code className="text-code text-fg">shadow-{name}</code>
              <p className="mt-1 text-caption text-fg-muted">{use}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Density in practice" note="Switch density in the header. The card padding, the row height, and the body size all move together, and this card does not know which mode it is in.">
        <Card>
          <CardTitle>Household: Bennett</CardTitle>
          <CardDescription>Four members, joined March 2023. Two children in the under-fives room.</CardDescription>
          <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {[["Primary contact", "Sarah Bennett"], ["Phone", "(512) 555 0148"], ["Last attended", "Sunday, 5 October"], ["Giving", "Monthly, general fund"]].map(([k, v]) => (
              <div key={k as string} className="flex flex-col">
                <dt className="text-label text-fg-muted">{k}</dt>
                <dd className="text-[length:var(--d-text-body)] text-fg">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </Section>
    </>
  );
}

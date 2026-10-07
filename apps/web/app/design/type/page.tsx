import { CodeDisplay } from "@connectapp/ui";
import { PageTitle, Section } from "@/components/section";

/** The gallery is a tool for us, so it names itself plainly. */
export const metadata = { title: "Design · type" };

const SCALE = [
  ["display-lg", "Page hero, empty states", "font-display text-display-lg"],
  ["display", "Page title", "font-display text-display"],
  ["heading", "Section heading", "font-display text-heading"],
  ["title", "Card and dialog title", "text-title"],
  ["body-lg", "Portal default, long form", "text-body-lg"],
  ["body", "Default", "text-body"],
  ["label", "Form labels, table headers", "text-label"],
  ["caption", "Helper text, timestamps", "text-caption"],
  ["code", "Codes and identifiers", "font-mono text-code"],
];

export default function Type() {
  return (
    <>
      <PageTitle
        title="Type"
        lede="Typography carries the hierarchy, not borders and not boxes. A serif for display is what stops this looking like every other dashboard."
      />

      <Section title="The three faces">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-line bg-surface p-4">
            <p className="font-display text-display leading-none">Aa</p>
            <p className="mt-3 text-label text-fg">Fraunces</p>
            <p className="text-caption text-fg-muted">Display. Warm and distinctive without being precious.</p>
          </div>
          <div className="rounded-lg border border-line bg-surface p-4">
            <p className="font-sans text-display font-semibold leading-none">Aa</p>
            <p className="mt-3 text-label text-fg">Inter</p>
            <p className="text-caption text-fg-muted">Everything functional. Tabular figures in tables and currency.</p>
          </div>
          <div className="rounded-lg border border-line bg-surface p-4">
            <p className="font-mono text-display font-medium leading-none">Aa</p>
            <p className="mt-3 text-label text-fg">JetBrains Mono</p>
            <p className="text-caption text-fg-muted">Codes and amounts. 0 and O, 1 and l are unambiguous.</p>
          </div>
        </div>
      </Section>

      <Section
        title="Why the mono matters"
        note="A volunteer reads a pickup code aloud across a room. If the face makes 0 look like O, a child goes to the wrong adult. This is a safety decision wearing a typography hat."
      >
        <div className="flex flex-wrap items-end gap-8 rounded-lg border border-line bg-surface p-6">
          <CodeDisplay code="4B07" label="Pickup code" />
          <div className="flex flex-col gap-1">
            <p className="font-mono text-heading">0O 1lI 5S 8B 2Z</p>
            <p className="text-caption text-fg-muted">Ambiguous pairs, set in the chosen face.</p>
          </div>
        </div>
      </Section>

      <Section title="Scale" note="Office mode. Station and portal scale from the same ratio. Never lighter than 400 for body text, because thin weights at 13px lock out a 70 year old volunteer.">
        <div className="flex flex-col divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {SCALE.map(([token, use, cls]) => (
            <div key={token as string} className="flex flex-wrap items-baseline justify-between gap-4 p-4">
              <p className={cls as string}>The quick brown fox</p>
              <div className="flex shrink-0 flex-col items-end">
                <code className="text-code text-fg-muted">{token}</code>
                <span className="text-caption text-fg-subtle">{use}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="In context" note="Fewer containers, better type.">
        <article className="max-w-prose rounded-lg border border-line bg-surface p-6">
          <p className="text-label text-accent-fg/70 uppercase tracking-wide">Sunday, 12 October</p>
          <h3 className="mt-1 font-display text-display text-fg">Morning Service</h3>
          <p className="mt-3 text-body-lg text-fg-muted">
            Four songs, a baptism, and the second week of the series. Running time is 74 minutes, which is
            six over, so the announcements come down to two.
          </p>
          <p className="mt-4 text-[length:var(--d-text-body)] text-fg">
            James has the set. Ruth has four volunteers in the under-fives room and needs a fifth.
          </p>
        </article>
      </Section>
    </>
  );
}

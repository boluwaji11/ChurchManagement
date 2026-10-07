import {
  Users, UserPlus, Baby, HandCoins, CalendarDays, Music, ClipboardList, Church,
  HeartHandshake, Mail, MessageSquare, Printer, Search, Settings, Bell, FileDown,
  ShieldCheck, WifiOff, AlertTriangle, CheckCircle2, Clock, MapPin, Tag, Award,
} from "lucide-react";
import { PageTitle, Section } from "@/components/section";

/** The gallery is a tool for us, so it names itself plainly. */
export const metadata = { title: "Design · icons" };

const CORE: [string, React.ElementType][] = [
  ["People", Users], ["New person", UserPlus], ["Children", Baby], ["Giving", HandCoins],
  ["Calendar", CalendarDays], ["Songs", Music], ["Plans", ClipboardList], ["Church", Church],
  ["Care", HeartHandshake], ["Email", Mail], ["SMS", MessageSquare], ["Print", Printer],
  ["Search", Search], ["Settings", Settings], ["Notifications", Bell], ["Export", FileDown],
  ["Background check", ShieldCheck], ["Offline", WifiOff], ["Warning", AlertTriangle],
  ["Confirmed", CheckCircle2], ["Pending", Clock], ["Location", MapPin], ["Tag", Tag],
  ["Milestone", Award],
];

export default function Icons() {
  return (
    <>
      <PageTitle
        title="Icons"
        lede="Lucide. Open licence, comprehensive, consistent. One concept, one glyph, registered once. No two glyphs for person."
      />

      <Section title="Sizing follows density" note="16 inline, 20 in office buttons, 24 in the portal, 32 on a station. Never mix stroke widths in one view.">
        <div className="flex flex-wrap items-end gap-8 rounded-lg border border-line bg-surface p-6">
          {[["16", 16, 1.5], ["20", 20, 1.5], ["24", 24, 2], ["32", 32, 2]].map(([label, size, stroke]) => (
            <div key={label as string} className="flex flex-col items-center gap-2">
              <Users size={size as number} strokeWidth={stroke as number} className="text-fg" />
              <code className="text-caption text-fg-subtle">{label}px</code>
            </div>
          ))}
        </div>
      </Section>

      <Section title="The core set" note="Icons are currentColor, always. An icon-only control carries an accessible label, and at station density icon-only controls are not permitted at all.">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {CORE.map(([label, Icon]) => (
            <div key={label} className="flex items-center gap-3 rounded-md border border-line bg-surface p-3">
              <Icon className="size-5 shrink-0 text-fg-muted" aria-hidden />
              <span className="text-label text-fg">{label}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Never emoji" note="Emoji render differently on every platform, cannot be recoloured, and read as unserious in a product handling giving records and children's whereabouts.">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger-soft p-3 text-danger-text">
            <span className="text-title">&#127881;</span>
            <span className="text-label">Not this</span>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-success/25 bg-success-soft p-3 text-success-text">
            <Award className="size-5" aria-hidden />
            <span className="text-label">This</span>
          </div>
        </div>
      </Section>
    </>
  );
}

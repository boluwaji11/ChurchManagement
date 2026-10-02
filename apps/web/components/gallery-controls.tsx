"use client";

import * as React from "react";
import { Monitor, Moon, Sun, LayoutDashboard, ScanLine, Smartphone } from "lucide-react";
import { cn } from "@hearth/ui";

type Density = "office" | "station" | "portal";
type Theme = "light" | "dark" | "system";

const DENSITIES: { id: Density; label: string; icon: React.ElementType; hint: string }[] = [
  { id: "office", label: "Office", icon: LayoutDashboard, hint: "Maria at a desk. Dense, keyboard-first." },
  { id: "station", label: "Station", icon: ScanLine, hint: "Doors open. Unmissable, zero ambiguity." },
  { id: "portal", label: "Portal", icon: Smartphone, hint: "A member on a phone. Warm, app-like." },
];

const THEMES: { id: Theme; label: string; icon: React.ElementType }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

/** localStorage can throw or come back empty. Render correctly without it. */
const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* private window, blocked site data. Not a failure worth surfacing. */
  }
};

export function GalleryControls() {
  const [density, setDensity] = React.useState<Density>("office");
  const [theme, setTheme] = React.useState<Theme>("system");

  React.useEffect(() => {
    const d = read("hearth.density") as Density | null;
    const t = read("hearth.theme") as Theme | null;
    if (d) setDensity(d);
    if (t) setTheme(t);
  }, []);

  React.useEffect(() => {
    document.documentElement.dataset.density = density;
    write("hearth.density", density);
  }, [density]);

  React.useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") delete root.dataset.theme;
    else root.dataset.theme = theme;
    write("hearth.theme", theme);
  }, [theme]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SegmentedGroup label="Density">
        {DENSITIES.map(({ id, label, icon: Icon, hint }) => (
          <Segment key={id} active={density === id} onClick={() => setDensity(id)} title={hint}>
            <Icon className="size-4" aria-hidden />
            {label}
          </Segment>
        ))}
      </SegmentedGroup>

      <SegmentedGroup label="Theme">
        {THEMES.map(({ id, label, icon: Icon }) => (
          <Segment key={id} active={theme === id} onClick={() => setTheme(id)} title={label}>
            <Icon className="size-4" aria-hidden />
            <span className="sr-only sm:not-sr-only">{label}</span>
          </Segment>
        ))}
      </SegmentedGroup>
    </div>
  );
}

function SegmentedGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex items-center gap-0.5 rounded-full border border-line bg-surface p-0.5 shadow-sm"
    >
      {children}
    </div>
  );
}

function Segment({
  active,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-label",
        "transition-colors duration-instant ease-out",
        active ? "bg-primary text-primary-fg" : "text-fg-muted hover:bg-sunken hover:text-fg",
      )}
      {...props}
    >
      {children}
    </button>
  );
}

import Link from "next/link";
import { GalleryControls } from "@/components/gallery-controls";

const NAV = [
  { href: "/design", label: "Overview" },
  { href: "/design/colour", label: "Colour" },
  { href: "/design/type", label: "Type" },
  { href: "/design/space", label: "Space and depth" },
  { href: "/design/icons", label: "Icons" },
  { href: "/design/motion", label: "Motion" },
  { href: "/design/components", label: "Components" },
  { href: "/design/station", label: "Station" },
];

export default function DesignLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur-none">
        <div className="mx-auto flex max-w-[90rem] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="font-display text-heading text-fg">Hearth</span>
            <span className="text-caption text-fg-subtle">design system</span>
          </Link>
          <GalleryControls />
        </div>
      </header>

      <div className="mx-auto flex max-w-[90rem] gap-8 px-4 py-8 sm:px-6">
        <nav aria-label="Design system sections" className="hidden w-44 shrink-0 lg:block">
          <ul className="sticky top-24 flex flex-col gap-0.5">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-md px-3 py-1.5 text-label text-fg-muted transition-colors duration-instant hover:bg-sunken hover:text-fg"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0 flex-1 pb-24">{children}</main>
      </div>
    </div>
  );
}

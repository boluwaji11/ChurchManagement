import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button, HUES } from "@hearth/ui";

export default function Home() {
  return (
    <main className="min-h-dvh grid place-items-center px-6 py-16">
      <div className="flex w-full max-w-xl flex-col items-start gap-6">
        <div aria-hidden className="flex gap-1.5">
          {HUES.map((h) => (
            <span
              key={h}
              className="h-8 w-3 rounded-full"
              style={{ background: `var(--hue-${h}-500)` }}
            />
          ))}
        </div>

        <h1 className="font-display text-display-lg text-fg">Hearth</h1>

        <p className="text-body-lg text-fg-muted">
          Church management software. No pay, always free. Every feature, every church, every time.
        </p>

        <p className="text-[length:var(--d-text-body)] text-fg-subtle">
          Two things work so far: the design system, and the data foundation behind the directory.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/design">
              Open the design gallery
              <ArrowRight />
            </Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/people">
              See the directory
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

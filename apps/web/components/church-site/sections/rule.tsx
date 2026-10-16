/**
 * HRT-379, R22.2. Air, a hairline, or a small mark.
 *
 * A church building a long page needs a way to say "that subject is finished"
 * without writing a heading for it, and the alternative is a church putting an
 * empty text section in and typing spaces into it. It holds no words, so there
 * is nothing here to read: the whole of it is hidden from a screen reader and
 * the page reads straight through it.
 *
 * Its own padding starts at none, because the height below is the point of the
 * section rather than something to add the theme's rhythm on top of.
 */

import { textOf, type SectionStyle } from "@connectapp/db/rules";
import { Band, Inner } from "../kit";
import type { SectionViewProps } from "../section-props";

const HEIGHTS: Record<string, string> = {
  small: "calc(var(--s-pad) * 0.4)",
  regular: "calc(var(--s-pad) * 0.8)",
  large: "calc(var(--s-pad) * 1.3)",
};

export function RuleSection({ section, site }: SectionViewProps) {
  const height = HEIGHTS[textOf(section.content["height"])] ?? HEIGHTS["regular"]!;
  const style: SectionStyle = {
    ...(section.style ?? {}),
    pad: section.style?.pad ?? "none",
  };

  if (section.variant === "space") {
    return (
      <Band id={section.id} style={style} site={site}>
        <div style={{ height }} aria-hidden />
      </Band>
    );
  }

  if (section.variant === "ornament") {
    return (
      <Band id={section.id} style={style} site={site}>
        <Inner>
          <div
            className="flex items-center justify-center gap-2"
            style={{ height }}
            aria-hidden
          >
            <span className="size-1.5 rounded-full bg-[var(--s-line)]" />
            <span className="size-2.5 rotate-45 bg-[var(--s-primary)]" />
            <span className="size-1.5 rounded-full bg-[var(--s-line)]" />
          </div>
        </Inner>
      </Band>
    );
  }

  return (
    <Band id={section.id} style={style} site={site}>
      <Inner>
        <div className="flex items-center" style={{ height }} aria-hidden>
          <span className="block h-px w-full bg-[var(--s-line)]" />
        </div>
      </Inner>
    </Band>
  );
}

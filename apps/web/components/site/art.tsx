import * as React from "react";
import { cn } from "@connectapp/ui";

/**
 * The illustrations behind the website.
 *
 * Flat vector drawings from unDraw, which is free for commercial use with no
 * attribution, recoloured at install time so their accent is our ink rather
 * than theirs. The files live in public/art and the recolour is in the commit
 * that added them, so a drawing arrives already in the product's colours.
 *
 * They sit in the margins of the centred sections, which is the room the design
 * leaves and the only room on the page that is not already carrying something.
 * Below 1280px those margins close up, so `Art` comes off rather than landing
 * on the words: a drawing over a paragraph is worse than no drawing. What a
 * narrow screen gets instead is `InlineArt`, the same drawing taking a line of
 * its own in the flow, because a phone reading the whole page as columns of
 * text is the one place the margins were doing the most work.
 */

/** Where a drawing sits, how wide, and which way it leans. */
export interface Piece {
  /** A file in public/art, without the extension. */
  name: string;
  side: "left" | "right";
  /** How far down the section, in per cent. */
  y: number;
  /** Width in pixels at full size. */
  size: number;
  /** How far the drawing sits in from the edge, in pixels. */
  inset?: number;
  turn?: number;
  /** Faint, for a drawing that sits behind the words rather than beside them. */
  faint?: boolean;
}

export function Art({ pieces, className }: { pieces: readonly Piece[]; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 hidden overflow-hidden xl:block", className)}
    >
      {pieces.map((piece) => (
        <img
          key={piece.name + piece.side}
          src={`/art/${piece.name}.svg`}
          alt=""
          className={piece.faint ? "absolute block opacity-[0.14]" : "absolute block opacity-90"}
          style={{
            [piece.side]: piece.inset ?? 24,
            top: `${piece.y}%`,
            width: piece.size,
            transform: `translateY(-50%) rotate(${piece.turn ?? 0}deg)`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * One of the same drawings, in the flow rather than in a margin.
 *
 * Shown exactly where `Art` is not: a phone and a tablet have no margin to
 * hang anything in, so the drawing takes its own line between the words and
 * whatever comes next. It is decoration, so it is hidden from a reader using
 * a screen reader, the same as the margin pieces.
 */
export function InlineArt({ name, className }: { name: string; className?: string }) {
  return (
    <img
      aria-hidden
      alt=""
      src={`/art/${name}.svg`}
      className={cn("mx-auto block w-[min(210px,58%)] opacity-90 xl:hidden", className)}
    />
  );
}

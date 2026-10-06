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
 * Below 1280px those margins close up, so they come off rather than landing on
 * the words: a drawing over a paragraph is worse than no drawing.
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
          className="absolute block opacity-90"
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

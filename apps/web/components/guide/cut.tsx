"use client";

import * as React from "react";
import { Tooltip, cn } from "@connectapp/ui";

/**
 * R22.1, R24.x. A line the rail has cut short says the rest of itself on hover.
 *
 * The guide's subtitles are ours to write and some phases need more words than
 * others, while the rail is one fixed width, so a line that fits today is a
 * line ending in an ellipsis after the next copy change. Measured on the glass
 * rather than guessed from the number of characters, and the tooltip only
 * exists while there is something hidden to show.
 */
export function Cut({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  /*
   * The node is held in state rather than a ref, because finding the line is
   * cut swaps the wrapper around it and React builds a fresh span. A ref would
   * leave the measuring looking at the old one, which is on its way out of the
   * document and reports no width at all, which reads as "it fits" and takes
   * the tooltip straight back off again.
   */
  const [line, setLine] = React.useState<HTMLSpanElement | null>(null);
  const [cut, setCut] = React.useState(false);

  React.useEffect(() => {
    if (!line) return;
    const look = () => {
      // The span being taken out of the document fires the observer at zero.
      if (!line.isConnected) return;
      // A sub-pixel width leaves scrollWidth a hair over clientWidth on a line
      // that is whole, which would put a tooltip on every subtitle.
      setCut(line.scrollWidth > line.clientWidth + 1);
    };
    look();

    /*
     * And again once the display face has loaded. The first measurement is
     * taken in the fallback font, which is narrower, so a line that will be
     * cut short can read as whole. The box itself never changes size, so the
     * observer below has nothing to fire on.
     */
    let live = true;
    document.fonts?.ready.then(() => { if (live) look(); }).catch(() => {});

    const watch = new ResizeObserver(look);
    watch.observe(line);
    return () => {
      live = false;
      watch.disconnect();
    };
  }, [line, children]);

  const words = (
    <span ref={setLine} className={cn("truncate", className)}>
      {children}
    </span>
  );

  return cut ? <Tooltip content={children}>{words}</Tooltip> : words;
}

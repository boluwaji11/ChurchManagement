"use client";

import * as React from "react";

/**
 * R24.6. Whether something is covering the page right now.
 *
 * A panel from the right and a box in the middle both land in the corner the
 * floating marks sit in, and a church pressing Filter met the message
 * launcher sitting on top of it. Every overlay in the product carries
 * `data-overlay`, and whatever floats watches for one.
 *
 * Watched rather than passed down, because the overlay and the mark are on
 * opposite sides of the tree: one is portalled to the body by whichever screen
 * opened it, and the other belongs to the frame.
 */
export function useOverlay(): boolean {
  const [covered, setCovered] = React.useState(false);

  React.useEffect(() => {
    const look = () => setCovered(Boolean(document.querySelector("[data-overlay]")));
    look();

    const watch = new MutationObserver(look);
    watch.observe(document.body, { childList: true, subtree: true });
    return () => watch.disconnect();
  }, []);

  return covered;
}

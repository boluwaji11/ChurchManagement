"use client";

import * as React from "react";

/**
 * R24.6. A panel forgets what was typed in it when it closes.
 *
 * The fields live in state that belongs to the screen rather than to the panel,
 * so it survives the panel being shut and the next person to open it meets
 * somebody else's half-finished sentence. This runs the reset the moment it
 * closes, whichever way it was closed: the button, the close cross, Escape, or
 * a press outside it.
 */
export function useResetOnClose(open: boolean, reset: () => void): void {
  const latest = React.useRef(reset);
  latest.current = reset;

  React.useEffect(() => {
    if (open) return;
    latest.current();
  }, [open]);
}

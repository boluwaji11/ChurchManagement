"use client";

import * as React from "react";

/**
 * R24.6. An error that belongs to the panel it was raised in.
 *
 * A dialog that failed to save keeps its component mounted behind it, so
 * ordinary state survives the close and the same red banner is waiting the next
 * time the panel opens, describing a press that happened minutes ago. This
 * clears it as the panel opens, so a reader only ever sees an error about what
 * they just did.
 *
 * `open` is whatever says the panel is showing: a boolean, or the thing being
 * acted on when a dialog opens by holding a row.
 */
export function useFormError(open: unknown) {
  const [error, setError] = React.useState<string>();

  React.useEffect(() => {
    if (open) setError(undefined);
  }, [open]);

  return [error, setError] as const;
}

"use client";

import * as React from "react";

/** The window opens on the printer dialog, because that is why it was opened. */
export function AutoPrint() {
  React.useEffect(() => {
    window.print();
  }, []);
  return null;
}

"use client";

import * as React from "react";
import { tabTitle } from "@/lib/tab-title";

/**
 * R17.1. What the browser tab says, kept said.
 *
 * A `<title>` React hoists is right on the first paint and then lost: moving
 * between screens without a reload leaves the router's own metadata in the
 * tab, which is the product's name and nothing about where the reader is. So
 * the name is written to the document on every render of the screen that owns
 * it.
 */
export function TabTitle({ page, church }: { page?: string; church: string }) {
  React.useEffect(() => {
    document.title = tabTitle(page, church);
  }, [page, church]);

  return null;
}

"use client";

import * as React from "react";
import type { LabelPair } from "@hearth/db";
import { readLabels } from "../offline/store";
import { LabelSheet } from "./sheet";

/**
 * R8.24. Labels printed from what the station is holding.
 *
 * The desk writes the pair down before it opens this window, so printing is a
 * local path: nothing here asks the server for anything, and a label comes out
 * of the printer with the network unplugged.
 */
export function LocalLabels({ printer }: { printer?: string }) {
  const [labels, setLabels] = React.useState<LabelPair[] | null>(null);

  React.useEffect(() => {
    void readLabels<LabelPair>().then(setLabels);
  }, []);

  if (labels === null) return null;
  return <LabelSheet labels={labels} printer={printer} />;
}

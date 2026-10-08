"use client";

import * as React from "react";
import { Spinner } from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/**
 * R24.6. A lookup that is waiting on the server says so.
 *
 * A field that goes to the directory on every few keystrokes reads as a field
 * with nothing in it until the answers land, and the empty row underneath says
 * "No match" while the match is still on its way. The mark sits at the right of
 * the field, clear of the chevron, and goes as soon as the answers arrive.
 */
export function Searching({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      {on ? (
        <Spinner
          label={t("common.searching")}
          className="pointer-events-none absolute top-1/2 right-9 -translate-y-1/2 text-fg-subtle"
        />
      ) : null}
    </div>
  );
}

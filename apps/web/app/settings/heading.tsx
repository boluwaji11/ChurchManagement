import * as React from "react";
import type { MessageKey } from "@connectapp/i18n";
import { t } from "@connectapp/i18n";

/**
 * R24.6. What this section is, and the one line that says what it is for.
 *
 * The design gives every settings section a 28px Fraunces title with a sentence
 * under it. A settings screen is the one place a church meets a word like
 * "pipeline" or "station" for the first time, so the sentence earns its place
 * here where it would not on a screen somebody opens daily.
 */
export function SettingsHeading({
  title,
  lede,
  action,
}: {
  title: MessageKey;
  lede: MessageKey;
  /** The one button this section carries, which sits on the right of the title. */
  action?: React.ReactNode;
}) {
  return (
    // A hairline under the name and its line, so every settings section starts
    // with the same rule and the page below it reads as its own block.
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-[22px] leading-[28px] text-fg">{t(title)}</h2>
        <p className="mt-1 text-fg-muted">{t(lede)}</p>
      </div>
      {action}
    </div>
  );
}

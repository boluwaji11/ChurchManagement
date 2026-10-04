import * as React from "react";
import type { MessageKey } from "@hearth/i18n";
import { t } from "@hearth/i18n";

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
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-[28px] leading-[34px] text-fg">{t(title)}</h2>
        <p className="mt-1 text-fg-muted">{t(lede)}</p>
      </div>
      {action}
    </div>
  );
}

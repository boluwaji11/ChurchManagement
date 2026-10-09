"use client";

import { Switch } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { usePush } from "../portal/installed";

/**
 * R16.10, R17.11. Notifications on this browser, as a preference.
 *
 * A preference rather than a button, because that is what it is: somebody says
 * once whether this machine should tell them when something arrives, and the
 * answer sits beside how the product is drawn.
 *
 * The state is this browser's subscription rather than the permission alone:
 * saying yes on a laptop is not saying yes on a phone, and the church has a
 * row for each. Nothing is drawn where the browser cannot do it at all, which
 * is the only honest way: a control that explains why it did nothing is worse
 * than no control.
 */
export function NotifyChoice({ church }: { church: string }) {
  const push = usePush(church);
  if (!push) return null;

  return (
    <div className="flex items-center justify-between gap-4">
      <label htmlFor="notify" className="text-label text-fg">
        {t("settings.pref.notifications")}
      </label>
      <Switch
        id="notify"
        checked={push.on}
        disabled={push.busy}
        onCheckedChange={push.toggle}
        aria-label={t("settings.pref.notifications")}
      />
    </div>
  );
}

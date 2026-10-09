"use client";

import { Bell, BellOff } from "lucide-react";
import { Tooltip, cn } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { usePush } from "../portal/installed";

/**
 * R16.10, R17.11. Saying yes to notifications on a staff screen.
 *
 * The portal has offered this since push existed. The office had no way to
 * turn it on, which meant somebody writing to the church on a service morning
 * reached a screen nobody was looking at.
 *
 * Draws nothing where the browser cannot do it at all, which is the only
 * honest way: a control that explains why it did nothing is worse than no
 * control. The state is read from the subscription this browser holds rather
 * than from the permission, because saying yes on a laptop is not saying yes
 * on a phone.
 */
export function PushToggle({
  church,
  collapsed,
}: {
  church: string;
  collapsed: boolean;
}) {
  const push = usePush(church);
  if (!push) return null;

  const label = push.on ? t("portal.notifyOff") : t("portal.notifyOn");

  return (
    <Tooltip content={label} side="right">
      <button
        type="button"
        disabled={push.busy}
        onClick={push.toggle}
        aria-label={label}
        className={cn(
          "flex h-9 cursor-pointer items-center gap-2.5 rounded-sm text-[13px] font-medium text-fg-muted hover:bg-line",
          collapsed ? "justify-center px-0" : "px-2.5",
        )}
      >
        {push.on
          ? <BellOff className="size-[18px] shrink-0" aria-hidden />
          : <Bell className="size-[18px] shrink-0" aria-hidden />}
        {collapsed ? null : <span className="whitespace-nowrap">{label}</span>}
      </button>
    </Tooltip>
  );
}

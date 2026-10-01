"use client";

import * as React from "react";
import { WifiOff, RefreshCw, TriangleAlert } from "lucide-react";
import { Button, Card } from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import type { Conflict } from "@hearth/db";
import type { StationState } from "./station";

/**
 * R8.22. What the station says about itself.
 *
 * It says it plainly, in the place the volunteer is already looking, and it
 * says what it means for them: the check-ins are on the tablet and they will go
 * when the wifi comes back. A station that fails silently is one where somebody
 * keeps pressing a button that is doing nothing.
 */
export function Connection({
  state,
  onSend,
  onDismiss,
}: {
  state: StationState;
  onSend: () => void;
  onDismiss: () => void;
}) {
  if (state.conflicts.length > 0) {
    return <Conflicts conflicts={state.conflicts} onDismiss={onDismiss} />;
  }

  if (state.online && state.waiting === 0) return null;

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 border-warning">
      <span className="flex items-center gap-2 text-[length:var(--d-text-body)] text-fg">
        {state.online ? (
          <RefreshCw className="size-5 text-fg-muted" aria-hidden />
        ) : (
          <WifiOff className="size-5 text-warning-text" aria-hidden />
        )}
        {state.online ? t("station.sending") : t("station.offline")}
        {state.waiting > 0 ? (
          <span className="text-fg-muted">{plural("station.waiting", state.waiting)}</span>
        ) : null}
      </span>

      {state.online && state.waiting > 0 ? (
        <Button variant="secondary" onClick={onSend}>{t("station.send")}</Button>
      ) : null}
    </Card>
  );
}

/**
 * R8.23. What reconciliation would not decide on its own.
 *
 * A child this station checked into one room who the record already has in
 * another is a question about where a child physically is. It is put in front
 * of a person, with the time it happened, and the record is left alone.
 */
function Conflicts({
  conflicts,
  onDismiss,
}: {
  conflicts: Conflict[];
  onDismiss: () => void;
}) {
  return (
    <Card className="flex flex-col gap-3 border-danger">
      <span className="flex items-center gap-2 text-heading text-fg">
        <TriangleAlert className="size-5 text-danger-text" aria-hidden />
        {t("station.conflicts.title")}
      </span>

      <ul className="flex flex-col gap-1">
        {conflicts.map((conflict) => (
          <li key={conflict.eventId} className="text-[length:var(--d-text-body)] text-fg">
            {t(`station.conflict.${conflict.kind}` as never)}
          </li>
        ))}
      </ul>

      <div>
        <Button variant="secondary" onClick={onDismiss}>{t("station.conflicts.seen")}</Button>
      </div>
    </Card>
  );
}

/** R8.21. The station keeps its screen when the network goes. */
export function useStationWorker() {
  React.useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/station-sw.js", { scope: "/checkin" }).catch(() => {
      // An unregistered worker means an online-only station, which the
      // connection bar already reports.
    });
  }, []);
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { stillWaiting } from "@/app/standing-actions";

/**
 * R1.1. Clears the banner when the church is approved, without a press.
 *
 * Approval happens somewhere else: an operator presses a button in the admin
 * portal, and this browser has no way of hearing about it. Every screen here is
 * built fresh per request, so any navigation would pick it up, and somebody
 * sitting on one screen waiting for the hour to pass would not.
 *
 * A question a minute, only while the tab is in front of somebody. It asks one
 * boolean and does nothing at all until the answer changes, at which point the
 * page is rebuilt from the server and the banner, the invitation button and the
 * sign-up switch all come right together.
 */
export function WatchApproval({ church }: { church: string }) {
  const router = useRouter();

  React.useEffect(() => {
    let stopped = false;

    const ask = async () => {
      if (document.hidden || stopped) return;
      try {
        if (!(await stillWaiting(church))) router.refresh();
      } catch {
        // A church that cannot be asked right now is asked again in a minute.
      }
    };

    const timer = window.setInterval(() => void ask(), 60_000);
    const back = () => void ask();
    document.addEventListener("visibilitychange", back);

    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", back);
    };
  }, [church, router]);

  return null;
}

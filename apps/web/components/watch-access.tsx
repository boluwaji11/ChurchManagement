"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { accessNow } from "@/app/standing-actions";

/**
 * R1.4. Rebuilds the screen when what this account may do changes.
 *
 * Somebody's role is changed on another person's screen, and the product in
 * front of them carries on offering what they no longer hold. The server
 * refuses the press, so nothing unsafe happens, which leaves them with a button
 * that answers an error. This asks once a minute, and the moment the answer
 * differs from what this page was built with the page is rebuilt: the sidebar,
 * the buttons and the screens all come right together.
 */
export function WatchAccess({ church, access }: { church: string; access: string }) {
  const router = useRouter();

  React.useEffect(() => {
    let stopped = false;

    const ask = async () => {
      if (document.hidden || stopped) return;
      try {
        if ((await accessNow(church)) !== access) router.refresh();
      } catch {
        // Asked again in a minute. A session that has gone is handled by the
        // redirect every page already performs.
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
  }, [church, access, router]);

  return null;
}

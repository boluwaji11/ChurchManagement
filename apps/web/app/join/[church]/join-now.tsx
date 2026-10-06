"use client";

import * as React from "react";
import { Spinner } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { join } from "./actions";

/**
 * Signing in was the decision. This is what follows from it.
 *
 * A church points somebody at its own address and they sign up. Asking them to
 * press one more button afterwards, on a screen they only reached by pressing
 * the first one, is a step that answers nothing. The write still happens in an
 * action rather than on the page load.
 */
export function JoinNow({ church }: { church: string }) {
  const started = React.useRef(false);

  React.useEffect(() => {
    if (started.current) return;
    started.current = true;
    void join(church);
  }, [church]);

  return <Spinner label={t("join.action")} className="self-center" />;
}

"use client";

import * as React from "react";
import { Button } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { AUTH_BUTTON } from "../../auth-chrome";
import { join } from "./actions";

/**
 * R1.7. Joining a church is a press.
 *
 * It used to run on mount, on the reasoning that signing in was already the
 * decision. That holds only for somebody who came through this screen's own
 * sign-in link. Anybody already signed in who opens the address, follows a
 * link to it, or whose browser reaches it ahead of them, never made that
 * decision, and the page wrote them into a church's records anyway.
 */
export function JoinNow({ church, name }: { church: string; name: string }) {
  const [going, start] = React.useTransition();

  return (
    <Button
      full
      className={AUTH_BUTTON}
      loading={going}
      onClick={() => start(() => join(church))}
    >
      {t("signUp.atChurch", { name })}
    </Button>
  );
}

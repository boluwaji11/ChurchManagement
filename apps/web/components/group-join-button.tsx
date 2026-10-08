"use client";

import * as React from "react";
import { Button } from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/**
 * R9.5, R24.6. The press that joins a published group.
 *
 * The page around it is a server component, so the form that writes lives here
 * where there is state to hold. The post navigates the whole page, and the flag
 * is set on submit rather than read from a transition, because nothing on this
 * page is a server action.
 */
export function GroupJoinButton({ action }: { action: string }) {
  const [going, setGoing] = React.useState(false);

  return (
    <form method="post" action={action} className="self-start" onSubmit={() => setGoing(true)}>
      <Button type="submit" loading={going} className="min-h-12 px-6 text-[16px]">
        {going ? t("publicGroups.joining") : t("publicGroups.join")}
      </Button>
    </form>
  );
}

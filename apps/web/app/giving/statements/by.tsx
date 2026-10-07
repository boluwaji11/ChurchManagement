"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { t } from "@connectapp/i18n";
import { chooseStatementsBy } from "./actions";

/**
 * R13.18. One statement a person, or one a household.
 *
 * Both are right for somebody, so the church chooses, and it chooses here
 * rather than three screens away in a settings form.
 */
export function StatementsBy({
  church,
  by,
}: {
  church: string;
  by: "person" | "household";
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  return (
    <div className="flex items-center gap-1 rounded-md bg-sunken p-[3px]" aria-busy={pending}>
      {(["person", "household"] as const).map((one) => (
        <button
          key={one}
          type="button"
          disabled={pending}
          aria-pressed={one === by}
          onClick={() =>
            startTransition(async () => {
              await chooseStatementsBy(one, church);
              router.refresh();
            })
          }
          className={`flex h-7 cursor-pointer items-center rounded-sm px-3 text-[13px] font-medium ${
            one === by ? "bg-surface text-fg shadow-sm" : "text-fg-muted"
          }`}
        >
          {t(`statement.by.${one}` as never)}
        </button>
      ))}
    </div>
  );
}

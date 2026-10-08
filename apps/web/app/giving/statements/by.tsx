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
    <div
      className="flex items-center gap-1 rounded-[var(--d-radius-control)] border border-line bg-sunken p-[3px]"
      aria-busy={pending}
    >
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
          /* The chosen side is the church's purple rather than a white pill
             on a near-white track, which read as neither pressed nor not. */
          className={`flex h-8 cursor-pointer items-center rounded-[6px] px-3 text-[13px] transition-colors duration-instant ${
            one === by
              ? "bg-primary font-semibold text-primary-fg"
              : "font-medium text-fg-muted hover:bg-surface hover:text-fg"
          }`}
        >
          {t(`statement.by.${one}` as never)}
        </button>
      ))}
    </div>
  );
}

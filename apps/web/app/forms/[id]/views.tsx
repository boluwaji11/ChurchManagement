"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/**
 * R4.1, R4.4. The two ways into one form: writing it, and reading what came in.
 *
 * The questions lead, because a church opens a form to change it far more
 * often than it opens one to read a single response.
 */
export function FormViews({ view }: { view: "questions" | "responses" }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const go = (next: "questions" | "responses") => {
    const query = new URLSearchParams(params.toString());
    if (next === "questions") query.delete("view");
    else query.set("view", next);
    router.push(`${pathname}?${query.toString()}`, { scroll: false });
  };

  return (
    <div className="flex items-center gap-1 self-start rounded-md bg-sunken p-[3px]">
      {(["questions", "responses"] as const).map((one) => (
        <button
          key={one}
          type="button"
          onClick={() => go(one)}
          aria-pressed={view === one}
          className={cn(
            "h-8 cursor-pointer rounded-sm px-3.5 text-[13px] font-medium",
            view === one ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg",
          )}
        >
          {t(`form.view.${one}` as never)}
        </button>
      ))}
    </div>
  );
}

"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn, Spinner } from "@connectapp/ui";
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

  /*
   * R24.6. Either half is rendered on the server, so the press holds: the tab
   * being opened carries a spinner and neither takes a second press until the
   * new half lands.
   */
  const [going, setGoing] = React.useState<string>();
  const [pending, start] = React.useTransition();

  React.useEffect(() => {
    if (!pending) setGoing(undefined);
  }, [pending]);

  const go = (next: "questions" | "responses") => {
    const query = new URLSearchParams(params.toString());
    if (next === "questions") query.delete("view");
    else query.set("view", next);
    setGoing(next);
    start(() => {
      router.push(`${pathname}?${query.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="flex items-center gap-1 self-start rounded-md bg-sunken p-[3px]">
      {(["questions", "responses"] as const).map((one) => (
        <button
          key={one}
          type="button"
          onClick={() => go(one)}
          aria-pressed={view === one}
          disabled={pending}
          className={cn(
            "flex h-8 cursor-pointer items-center gap-1.5 rounded-sm px-3.5 text-[13px] font-medium",
            "disabled:cursor-default",
            view === one ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg",
          )}
        >
          {going === one ? <Spinner className="[&>span]:size-3.5" /> : null}
          {t(`form.view.${one}` as never)}
        </button>
      ))}
    </div>
  );
}

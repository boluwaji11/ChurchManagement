"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Monitor, Sun, Moon } from "lucide-react";
import { cn } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { setTheme, type Theme } from "./theme-actions";

/** The default leads, then the two that override it. */
const CHOICES: { value: Theme; icon: typeof Sun }[] = [
  { value: "system", icon: Monitor },
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
];

/** R24.x. Three choices, and the default asks the device. */
export function ThemeChoice({ current }: { current: Theme }) {
  const router = useRouter();
  const [chosen, setChosen] = React.useState<Theme>(current);
  const [pending, startTransition] = React.useTransition();

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t("theme.title")}>
      {CHOICES.map(({ value, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={chosen === value}
          disabled={pending}
          onClick={() => {
            setChosen(value);
            startTransition(async () => {
              await setTheme(value);
              router.refresh();
            });
          }}
          className={cn(
            // Three small choices, sized to their words rather than stretched
            // across whatever room the card has.
            "flex cursor-pointer items-center gap-2 rounded-[10px] bg-surface px-3.5 py-2.5 text-left text-[13px] font-medium",
            chosen === value
              ? "border-[1.5px] border-primary text-fg"
              : "border border-line text-fg-muted hover:bg-sunken hover:text-fg",
          )}
        >
          <Icon className="size-4" aria-hidden />
          {t(`theme.${value}` as never)}
        </button>
      ))}
    </div>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Monitor, Sun, Moon } from "lucide-react";
import { cn } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { setTheme, type Theme } from "./theme-actions";

/** The design's order: the two a person picks, then the one that asks the device. */
const CHOICES: { value: Theme; icon: typeof Sun }[] = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
];

/** R24.x. Three choices, and the default asks the device. */
export function ThemeChoice({ current }: { current: Theme }) {
  const router = useRouter();
  const [chosen, setChosen] = React.useState<Theme>(current);
  const [pending, startTransition] = React.useTransition();

  return (
    <div className="flex flex-wrap gap-3" role="group" aria-label={t("theme.title")}>
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
            "flex flex-[1_1_140px] cursor-pointer flex-col items-start gap-2.5 rounded-[14px] bg-surface p-4 text-left font-medium",
            chosen === value
              ? "border-[1.5px] border-primary text-fg"
              : "border border-line text-fg-muted hover:border-line-strong hover:text-fg",
          )}
        >
          <Icon className="size-5" aria-hidden />
          {t(`theme.${value}` as never)}
        </button>
      ))}
    </div>
  );
}

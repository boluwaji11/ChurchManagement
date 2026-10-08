"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Monitor, Sun, Moon } from "lucide-react";
import { Tooltip, cn } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { setTheme, type Theme } from "@/app/settings/theme-actions";

/** The default leads, then the two that override it. */
const CHOICES: { value: Theme; icon: typeof Sun }[] = [
  { value: "system", icon: Monitor },
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
];

/**
 * R24.x. Light, dark, or whatever the device is set to, on the public site.
 *
 * Three marks rather than a row of words: somebody reading the website is
 * here to read the website, and the choice is one they make once. It sits in
 * the footer with the rest of the small print, where somebody goes looking
 * for it, rather than riding over the page while they scroll.
 *
 * The choice is the same cookie the staff screens keep, so somebody who picks
 * dark here is still in dark when they sign in.
 */
export function ThemeDock({ current }: { current: Theme }) {
  const router = useRouter();
  const [chosen, setChosen] = React.useState<Theme>(current);
  const [pending, start] = React.useTransition();

  return (
    <div
      role="group"
      aria-label={t("theme.title")}
      className={cn(
        "flex items-center gap-0.5 rounded-full border border-line bg-surface p-1",
        pending && "opacity-60",
      )}
    >
      {CHOICES.map(({ value, icon: Icon }) => {
        const on = chosen === value;
        return (
          <Tooltip key={value} content={t(`theme.${value}` as never)}>
          <button
            type="button"
            aria-pressed={on}
            aria-label={t(`theme.${value}` as never)}
            disabled={pending}
            onClick={() => {
              setChosen(value);
              start(async () => {
                await setTheme(value);
                router.refresh();
              });
            }}
            className={cn(
              "grid size-8 cursor-pointer place-items-center rounded-full [&_svg]:size-4",
              "transition-colors duration-instant disabled:cursor-default",
              on ? "bg-primary text-primary-fg" : "text-fg-muted hover:bg-sunken hover:text-fg",
            )}
          >
            <Icon aria-hidden />
          </button>
          </Tooltip>
        );
      })}
    </div>
  );
}

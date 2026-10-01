"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Monitor, Sun, Moon } from "lucide-react";
import { Button, Card, CardTitle, Separator } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { setTheme, type Theme } from "./theme-actions";

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
    <Card>
      <CardTitle>{t("theme.title")}</CardTitle>
      <Separator className="my-4" />

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("theme.title")}>
        {CHOICES.map(({ value, icon: Icon }) => (
          <Button
            key={value}
            variant={chosen === value ? "primary" : "secondary"}
            aria-pressed={chosen === value}
            disabled={pending}
            onClick={() => {
              setChosen(value);
              startTransition(async () => {
                await setTheme(value);
                router.refresh();
              });
            }}
          >
            <Icon /> {t(`theme.${value}` as never)}
          </Button>
        ))}
      </div>
    </Card>
  );
}

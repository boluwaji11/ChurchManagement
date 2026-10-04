import { cookies } from "next/headers";
import { requireSession } from "@/lib/session";
import { SettingsHeading } from "../heading";
import { ThemeChoice } from "../theme";
import type { Theme } from "../theme-actions";

export const dynamic = "force-dynamic";

/** R24.x. Light, dark, or whatever this device is set to. */
export default async function AppearancePage() {
  await requireSession();
  const theme = ((await cookies()).get("hearth-theme")?.value ?? "system") as Theme;

  return (
    <>
      <SettingsHeading title="settings.tab.appearance" lede="settings.lede.appearance" />
      <ThemeChoice current={theme} />
    </>
  );
}

import { requireSession } from "@/lib/session";
import { SettingsHeading } from "../heading";
import { Security } from "./security";
import { t } from "@connectapp/i18n";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  return tabMetadata(t("settings.tab.security"), church);
}

/** R1.8. How somebody gets in, and the two ways to change it. */
export default async function SecurityPage() {
  const session = await requireSession();

  return (
    <>
      <SettingsHeading title="settings.tab.security" lede="settings.lede.security" />
      <Security email={session.email} />
    </>
  );
}

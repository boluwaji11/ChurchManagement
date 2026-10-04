import { requireSession } from "@/lib/session";
import { SettingsHeading } from "../heading";
import { Security } from "./security";

export const dynamic = "force-dynamic";

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

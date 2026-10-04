import {
  withTenant, getChurch, canManageChurch,
  getStorageUsage, primaryCampus, listLocations,
} from "@hearth/db";
import { requireSession } from "@/lib/session";
import { Places } from "./places";
import { ChurchForm } from "../church-form";
import { LogoAndStorage } from "../logo";
import { supabaseServer } from "@/lib/supabase/server";
import { SettingsHeading } from "../heading";

export const dynamic = "force-dynamic";

/** Bytes as a church reads them: "1.2 GB", "282 kB". */
function size(bytes: number): string {
  const units = ["B", "kB", "MB", "GB", "TB"];
  let value = bytes;
  let at = 0;
  while (value >= 1000 && at < units.length - 1) {
    value /= 1000;
    at += 1;
  }
  return `${at === 0 ? value : value.toFixed(value < 10 ? 1 : 0)} ${units[at]}`;
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  const { profile, usage, campus, places } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => ({
      profile: await getChurch(tx, session.tenantId),
      usage: await getStorageUsage(tx, session.tenantId),
      // R1.2. The one campus, and the places inside it.
      campus: await primaryCampus(tx),
      places: await listLocations(tx),
    }),
  );

  // The bucket is private, so the logo is served through a short-lived signed
  // URL. A leaked path is then a leak with an expiry rather than a permanent one.
  let logoUrl: string | null = null;
  if (profile?.logoKey) {
    const supabase = await supabaseServer();
    const signed = await supabase.storage.from("church").createSignedUrl(profile.logoKey, 3600);
    logoUrl = signed.data?.signedUrl ?? null;
  }

  return (
    <div className="flex flex-col gap-5">
      <SettingsHeading title="settings.tab.church" lede="settings.lede.church" />
        {profile ? (
          <LogoAndStorage
            church={session.tenantSlug}
            churchName={session.tenantName}
            logoUrl={logoUrl}
            fraction={usage.fraction}
            used={size(usage.usedBytes)}
            quota={size(usage.quotaBytes)}
            warning={usage.warning}
            canEdit={canManageChurch(session.role)}
          />
        ) : null}

        <Places
          church={session.tenantSlug}
          campus={campus}
          places={places}
          canEdit={canManageChurch(session.role)}
        />

        {profile ? (
          <ChurchForm
            values={profile}
            canEdit={canManageChurch(session.role)}
          />
        ) : null}
    </div>
  );
}

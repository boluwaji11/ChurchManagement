import {
  withTenant, getChurch, canManageChurch,
  primaryCampus,
} from "@connectapp/db";
import { requireSession } from "@/lib/session";
import { ChurchSections } from "./sections";
import { ChurchLogo } from "../logo";
import { supabaseServer } from "@/lib/supabase/server";
import { SettingsHeading } from "../heading";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  const { profile, campus } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => ({
      profile: await getChurch(tx, session.tenantId),
      // R1.2. The one campus every record in this church hangs off.
      campus: await primaryCampus(tx),
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
        {profile ? (
          <ChurchSections
            heading={<SettingsHeading title="settings.tab.church" lede="settings.lede.church" />}
            church={session.tenantSlug}
            values={profile}
            campus={campus}
            canEdit={canManageChurch(session)}
            logo={
              <ChurchLogo
                church={session.tenantSlug}
                churchName={session.tenantName}
                logoUrl={logoUrl}
                canEdit={canManageChurch(session)}
              />
            }
          />
        ) : null}

    </div>
  );
}

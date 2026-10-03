import {
  withTenant, getChurch, canManageChurch,
  getStorageUsage, primaryCampus, listLocations,
} from "@hearth/db";
import { Card, CardTitle, Separator } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { requireSession } from "@/lib/session";
import { Places } from "./places";
import { ChurchForm } from "../church-form";
import { LogoAndStorage } from "../logo";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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
    <div className="flex flex-col gap-6">
        {profile ? (
          <Card>
            <CardTitle>{t("church.logo")}</CardTitle>
            <Separator className="my-4" />
            <LogoAndStorage
              church={session.tenantSlug}
              churchName={session.tenantName}
              logoUrl={logoUrl}
              fraction={usage.fraction}
              warning={usage.warning}
              canEdit={canManageChurch(session.role)}
            />
          </Card>
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

import { headers } from "next/headers";
import { withTenant, getChurch, canManageChurch } from "@connectapp/db";
import { requireSession } from "@/lib/session";
import { Denied } from "@/components/denied";
import { SettingsHeading } from "../heading";
import { PortalAddress } from "../church/portal-address";
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
  return tabMetadata(t("settings.tab.website"), church);
}

/**
 * R1.7, R9.5, R1.17. What this church puts on its own website.
 *
 * Its own screen rather than the foot of the church profile: the addresses, the
 * sign-up switch and the domain are one errand, done once by whoever looks
 * after the website, and they were sitting under the name, the address and the
 * service times, which are read far more often.
 */
export default async function WebsitePage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);
  if (!canManageChurch(session)) {
    return <Denied role={session.role} action="editChurch" church={session.tenantSlug} />;
  }

  const { profile } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => ({
      profile: await getChurch(tx, session.tenantId),
      // R1.1. Every address on this screen is refused until the church is approved.
    }),
  );

  // R9.5. The address a church pastes into its own site, as this request saw it.
  const head = await headers();
  const host = head.get("x-forwarded-host") ?? head.get("host") ?? "";
  const proto = head.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  /* R1.1. Our own host, which every church gets a name under. The request's
     host while somebody is working on it, so riverside.localhost answers. */
  const platformHost = process.env["PLATFORM_HOST"] ?? (host.includes(".") ? host.replace(/^[^.]+\./, "") : host);

  return (
    <>
      <SettingsHeading title="settings.tab.website" lede="settings.lede.website" />

      {/* R24.6. The address and the member's door stand together, because the
          door is the address with a path on it. The finder's snippet is wide
          and takes the row under them. */}
      <div className="grid max-w-[1120px] items-start gap-5">
        <PortalAddress
          church={session.tenantSlug}
          slug={session.tenantSlug}
          name={profile?.portalName ?? null}
          host={platformHost}
          origin={`${proto}:`}
          portalOpen={profile?.portalOpen ?? true}
          canEdit={canManageChurch(session)}
        />

      </div>
    </>
  );
}

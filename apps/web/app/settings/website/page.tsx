import { headers } from "next/headers";
import { withTenant, getChurch, canManageChurch, readDomain, dnsResolver } from "@connectapp/db";
import { slugUnderPlatform, builderFromNameservers } from "@connectapp/db/rules";
import { requireSession } from "@/lib/session";
import { Denied } from "@/components/denied";
import { SettingsHeading } from "../heading";
import { PortalAddress } from "../church/portal-address";
import { OnYourSite } from "../church/on-your-site";
import { publicLink } from "@/lib/church-address";
import { cookieDomain } from "@/lib/cookie-domain";
import { t } from "@connectapp/i18n";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ }>;
}) {
  const {} = await searchParams;
  return tabMetadata(t("settings.tab.website"));
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
  searchParams: Promise<{ }>;
}) {
  const {} = await searchParams;
  const session = await requireSession();
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
  /*
   * R1.1. Our own host, which every church gets a name under.
   *
   * Read off the request rather than out of the environment, because the
   * environment names the host and the request carries the port, and an
   * address shown without the port is an address that does not work while
   * somebody is working on it.
   */
  const under = slugUnderPlatform(host);
  const platformHost = under ? host.slice(under.length + 1) : host;

  /* R9.5, R17.1. Built on the server through the one helper, so what a church
     pastes into its own site and what the route answers on cannot disagree. */
  const [giving, groups, groupsFrame, join] = await Promise.all([
    publicLink(session.tenantSlug, "give"),
    publicLink(session.tenantSlug, "g"),
    publicLink(session.tenantSlug, "g", "/embed"),
    publicLink(session.tenantSlug, "join"),
  ]);

  /*
   * R9.5. A guess at where the site is built, for a church that has not said.
   * Only some nameservers name a builder, and the common case, a name bought
   * at a registrar and a site built somewhere else, names none. Read only
   * when there is something to read and nothing already answered.
   */
  const guessed =
    profile?.siteBuilder || !profile?.website
      ? null
      : builderFromNameservers(
          (await readDomain(profile.website, dnsResolver()))?.nameservers ?? [],
        );

  return (
    <>
      <SettingsHeading title="settings.tab.website" lede="settings.lede.website" />

      {/* R24.6. The address on the left, what goes on the church's own site
          on the right. One column is about where members reach ConnectApp,
          the other is about what the church hands to its own visitors, and
          stacking them put the second where nobody scrolled. */}
      <div className="grid max-w-[1120px] gap-5 lg:grid-cols-2">
        <PortalAddress
          church={session.tenantSlug}
          slug={session.tenantSlug}
          name={profile?.portalName ?? null}
          host={platformHost}
          origin={`${proto}:`}
          /* R1.4. Whether a session survives the move to the new name. */
          spanning={Boolean(cookieDomain())}
          portalOpen={profile?.portalOpen ?? true}
          canEdit={canManageChurch(session)}
        />

        {/* R9.5, R13.5. What goes on the site the church already has, behind
            a rule, because the two columns answer different questions. */}
        <section className="flex h-full flex-col gap-4 lg:border-l lg:border-line lg:pl-8">
          <h3 className="m-0 font-display text-[17px] leading-6 text-fg">
            {t("site.onYourSite")}
          </h3>
          <OnYourSite
            giving={giving}
            groups={groups}
            groupsFrame={groupsFrame}
            join={join}
            builder={profile?.siteBuilder ?? null}
            guessed={guessed}
          />
        </section>
      </div>
    </>
  );
}

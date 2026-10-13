import {
  withTenant, emailProvider, sendingDomain, canManageChurch,
  getChurch, readDomain, dnsResolver, consoleFor,
} from "@connectapp/db";
import { Banner } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { Denied } from "@/components/denied";
import { SettingsHeading } from "../heading";
import { EmailSetup } from "./email-setup";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata() {
  return tabMetadata(t("settings.tab.email"));
}

/** What came back from Resend, where there is anything to say. */
const SAID = [
  "connected", "refused", "expired", "exchange", "domain", "noAddress", "unconfigured",
] as const;

/**
 * HRT-287, HRT-288, R16.1, R21.15, R22.2. The account a church's email leaves
 * through, and the domain it leaves from.
 *
 * These were two screens. Reading what a church's domain is set up with and
 * fixing what its sending needs are the same job, and a volunteer who went to
 * Domain to find out why their mail was not arriving found a reading with
 * nothing to press.
 *
 * Two ways in, and the first of them is the mail the church already has: a
 * church on Google Workspace already sends from its own domain, so its SPF,
 * its DKIM and its DMARC are right before we arrive and there is nothing to
 * add at a registrar. Resend is for the church sending more in a day than its
 * mail host allows, and that one is a press and a yes.
 *
 * Nothing here reads a credential. The handshake with Resend happens in the
 * routes under `/api/providers/resend`, and whether the records are published
 * is answered from public DNS, which is what every mail server on the internet
 * reads anyway.
 */
export default async function EmailPage({
  searchParams,
}: {
  searchParams: Promise<{ resend?: string }>;
}) {
  const { resend } = await searchParams;
  const session = await requireSession();
  if (!canManageChurch(session)) {
    return <Denied role={session.role} action="editChurch" church={session.tenantSlug} />;
  }

  const read = await withTenant(
    {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      permissions: session.permissions,
    },
    async (tx) => ({
      provider: await emailProvider(tx),
      domain: await sendingDomain(tx),
      profile: await getChurch(tx, session.tenantId),
    }),
  );

  /* R22.2. Read live rather than remembered. A church changes its email
     provider and a reading kept from sign-up describes a domain that is no
     longer there. */
  const website = read.profile?.website ?? null;
  const found = website ? await readDomain(website, dnsResolver()) : null;

  const said = SAID.find((one) => one === resend);

  return (
    <>
      <SettingsHeading title="settings.tab.email" lede="settings.lede.email" />

      {said ? (
        <Banner tone={said === "connected" ? "success" : "danger"}>
          {t(`email.said.${said}` as never)}
        </Banner>
      ) : null}

      <EmailSetup
        provider={read.provider}
        domain={
          read.domain
            ? { ...read.domain, checkedAt: read.domain.checkedAt?.toISOString() ?? null }
            : null
        }
        church={{
          name: read.profile?.name ?? "",
          email: read.profile?.email ?? "",
        }}
        registrar={found?.registrar ?? null}
        console_={consoleFor(found?.registrar)}
        dkimTaken={found?.dkimTaken ?? false}
      />

    </>
  );
}

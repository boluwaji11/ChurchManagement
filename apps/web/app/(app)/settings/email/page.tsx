import {
  withTenant, emailProvider, sendingDomain, canManageChurch,
  readDomain, dnsResolver, consoleFor, stepsFor,
} from "@connectapp/db";
import { Banner } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { shellData } from "@/lib/shell-data";
import { Denied } from "@/components/denied";
import { SettingsHeading } from "../heading";
import { EmailSetup } from "./email-setup";
import { discover, settingsFor, holdsOurTemplate, variablesFrom, applyUrl } from "@/lib/domain-connect";
import { churchOrigin } from "@/lib/church-address";
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

  const profile = (await shellData(session)).church;

  const read = await withTenant(
    {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      permissions: session.permissions,
    },
    /* R24.11. Two reads that want nothing from each other, together. The
       church itself comes from the frame, which has already read it. */
    async (tx) => {
      /* The provider first, because the domain is read for that provider:
         an older one left behind by a church that connected twice is not the
         one it is sending from. */
      const provider = await emailProvider(tx);
      const domain = provider ? await sendingDomain(tx, provider.id) : null;
      return { provider, domain, profile };
    },
  );

  /* R22.2. Read live rather than remembered. A church changes its email
     provider and a reading kept from sign-up describes a domain that is no
     longer there. */
  const website = read.profile?.website ?? null;
  const found = website ? await readDomain(website, dnsResolver()) : null;

  /*
   * HRT-289, R22.2. Whether this church's DNS company can do it in one press.
   *
   * Asked only while there is something outstanding to add, because it is
   * three calls out to somebody else's servers and a church with nothing left
   * to do has no use for the answer. A company that has never heard of us
   * answers no, and the press is simply not drawn.
   */
  const onepress = await (async () => {
    if (read.provider?.vendor !== "resend") return null;
    if (!read.domain || read.domain.state === "verified") return null;

    const variables = variablesFrom(read.domain.records);
    if (!variables) return null;

    const host = await discover(read.domain.domain, dnsResolver());
    if (!host) return null;

    const settings = await settingsFor(host, read.domain.domain);
    if (!settings || !(await holdsOurTemplate(settings.urlAPI))) return null;

    const origin = await churchOrigin(session.tenantSlug);
    return applyUrl({
      urlSyncUX: settings.urlSyncUX,
      domain: read.domain.domain,
      variables,
      redirectUri: `${origin ?? ""}/settings/email`,
      state: session.tenantId,
    });
  })();

  /*
   * R16.1. What the round trip to Resend said, where it is still true.
   *
   * It arrives in the address, and the address survives a disconnect: the
   * action writes, revalidates, and the screen comes back on the same URL
   * with "Connected to Resend" sitting over two cards offering to connect.
   * A message about having connected is only worth saying while something is
   * connected.
   */
  const told = SAID.find((one) => one === resend);
  const said = told === "connected" && !read.provider ? undefined : told;

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
        signedInAs={session.email}
        registrar={found?.registrar ?? null}
        console_={consoleFor(found?.registrar)}
        /* R22.2, R16.1. The words, rather than the key that names them.
           The key is chosen in the db package by the registrar's own name, so
           nothing in the browser's own files ever writes it down and the
           client catalogue cannot know to carry it: the screen drew
           "dns.steps.vercel" at the reader. Read here, where the whole
           catalogue is. */
        steps={t(stepsFor(found?.registrar) as never)}
        onepress={onepress}
      />

    </>
  );
}

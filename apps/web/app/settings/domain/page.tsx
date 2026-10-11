import Link from "next/link";
import { withTenant, getChurch, canManageChurch, readDomain, dnsResolver } from "@connectapp/db";
import { ArrowRight } from "lucide-react";
import { Banner } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { Denied } from "@/components/denied";
import { SettingsHeading } from "../heading";
import { DomainReading } from "../church/domain-reading";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata() {
  return tabMetadata(t("settings.tab.domain"));
}

/**
 * HRT-283, R22.2. What the church's own domain is set up with today.
 *
 * Read live rather than remembered. A church changes its email provider, or
 * somebody at the registrar edits a record, and a reading from sign-up would
 * then describe a domain that no longer exists. Every lookup is public DNS,
 * which is what any mail server on the internet reads before it delivers to
 * them, so nothing here needs a password or touches their account.
 *
 * It says what is there and stops. What we would add is for the screen that
 * can add it, and nothing in the product sends mail yet.
 */
export default async function DomainPage() {
  const session = await requireSession();
  if (!canManageChurch(session)) {
    return <Denied role={session.role} action="editChurch" church={session.tenantSlug} />;
  }

  const profile = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => getChurch(tx, session.tenantId),
  );

  const website = profile?.website ?? null;
  const found = website ? await readDomain(website, dnsResolver()) : null;

  return (
    <>
      <SettingsHeading title="settings.tab.domain" />

      {!website ? (
        <Banner tone="info">
          {t("domain.none")}{" "}
          <Link href="/settings/church" className="font-medium text-primary">
            {t("domain.addOne")}
          </Link>
        </Banner>
      ) : !found ? (
        <Banner tone="danger">{t("domain.error.notADomain")}</Banner>
      ) : (
        <>
          <p className="text-[length:var(--d-text-body)] text-fg-muted">
            <code className="font-mono text-fg">{found.domain}</code>
          </p>
          {/* R22.2. The plan belongs to the screen that can act on it. */}
          <DomainReading
            found={found}
            plan={false}
            fix={
              <Link
                href="/settings/church"
                className="inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline"
              >
                {t("domain.churchProfile")} <ArrowRight className="size-[14px]" aria-hidden />
              </Link>
            }
          />
        </>
      )}
    </>
  );
}

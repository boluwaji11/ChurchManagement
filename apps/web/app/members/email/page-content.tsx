import Link from "next/link";
import {
  withTenant, emailProvider, sendingDomain, listSavedLists, listGroups,
  listSends, countWithdrawn, listWithdrawn, canManageChurch,
} from "@connectapp/db";
import { Banner } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { Denied } from "@/components/denied";
import { ScreenPanel } from "@/components/screen-panel";
import { Composer } from "./composer";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata() {
  return tabMetadata(t("send.title"));
}

/**
 * HRT-139, R16.4, R16.8. One message to a church's people.
 *
 * The account it leaves through is set up once on the Email settings screen.
 * This is the writing and the sending, and it refuses to open for a church
 * that has nothing to send through, because a composer with no way out of it
 * is a form that wastes somebody's afternoon.
 */
export async function EmailPanelPage() {
  const session = await requireSession();
  if (!canManageChurch(session)) {
    return (
      <ScreenPanel title={t("send.title")} closeTo="/members">
        <Denied role={session.role} action="editChurch" church={session.tenantSlug} />
      </ScreenPanel>
    );
  }

  const ctx = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };

  const read = await withTenant(ctx, async (tx) => ({
    provider: await emailProvider(tx),
    domain: await sendingDomain(tx),
    lists: await listSavedLists(tx),
    groups: await listGroups(tx, {}),
    sent: await listSends(tx),
    withdrawn: await countWithdrawn(tx),
    out: await listWithdrawn(tx),
  }));

  /* R16.1. Resend is only sending once its domain is verified, so a church
     halfway through setting up is told that rather than left to find out from
     a refusal on four hundred messages. */
  const ready =
    read.provider !== null &&
    (read.provider.vendor !== "resend" || read.domain?.state === "verified");

  return (
    <ScreenPanel title={t("send.title")} closeTo="/members" width="max-w-[860px]">

      {!ready ? (
        <Banner tone="info">
          {t("send.notConnected")}{" "}
          <Link href="/settings/email" className="font-medium text-primary">
            {t("send.connect")}
          </Link>
        </Banner>
      ) : (
        <Composer
          lists={read.lists.map((one) => ({ id: one.id, name: one.name }))}
          groups={read.groups.map((one) => ({ id: one.id, name: one.name }))}
          sent={read.sent.map((one) => ({
            id: one.id,
            subject: one.subject,
            delivered: one.delivered,
            failed: one.failed,
            sentAt: one.sentAt?.toISOString() ?? null,
          }))}
          out={read.out.map((one) => ({
            id: one.id,
            address: one.address,
            name: one.name,
            withdrawnAt: one.withdrawnAt?.toISOString() ?? null,
          }))}
          withdrawn={read.withdrawn}
        />
      )}
    </ScreenPanel>
  );
}

import Link from "next/link";
import {
  withTenant, emailProvider, sendingDomain, listSavedLists, listGroups,
  listSends, countSends, countWithdrawn, listWithdrawn, countAllWithdrawn,
  emailRecipientsFor, canManageChurch,
} from "@connectapp/db";
import { Banner } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { Denied } from "@/components/denied";
import { ScreenPanel } from "@/components/screen-panel";
import { Composer } from "./composer";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R16.6. How many sends a page of the Sent list holds. */
const PAGE = 10;

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
export async function EmailPanelPage({
  searchParams,
}: {
  /** HRT-341. The people ticked in the directory, when that is how this opened. */
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
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

  /* HRT-341, R16.4. The ids the selection bar carried over, resolved here so
     the chips show the names whoever ticked them was reading. */
  const asked = (await searchParams)?.["ids"];
  const ids = (typeof asked === "string" ? asked.split(",") : [])
    .map((one) => one.trim())
    .filter(Boolean);

  const read = await withTenant(ctx, async (tx) => ({
    provider: await emailProvider(tx),
    domain: await sendingDomain(tx),
    lists: await listSavedLists(tx),
    groups: await listGroups(tx, {}),
    sent: await listSends(tx, { limit: PAGE }),
    sends: await countSends(tx),
    withdrawn: await countWithdrawn(tx),
    chosen: ids.length
      ? await emailRecipientsFor(tx, { audience: "people", memberIds: ids })
      : [],
    out: await listWithdrawn(tx, { limit: PAGE }),
    outs: await countAllWithdrawn(tx),
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
          preset={read.chosen.map((one) => ({
            id: one.memberId,
            name: one.name,
            address: one.address,
          }))}
          sent={read.sent.map((one) => ({
            id: one.id,
            subject: one.subject,
            state: one.state,
            total: one.total,
            done: one.done ?? 0,
            delivered: one.delivered,
            failed: one.failed,
            sentAt: one.sentAt?.toISOString() ?? null,
            sendAt: one.sendAt?.toISOString() ?? null,
          }))}
          out={read.out.map((one) => ({
            id: one.id,
            address: one.address,
            name: one.name,
            withdrawnAt: one.withdrawnAt?.toISOString() ?? null,
          }))}
          sends={read.sends}
          outs={read.outs}
          withdrawn={read.withdrawn}
        />
      )}
    </ScreenPanel>
  );
}

import "server-only";
import type { TenantRole, Telling } from "@connectapp/db";
import { pushTo } from "@/lib/push";

/**
 * R16.9, R16.10. A line arriving on the phone in somebody's pocket.
 *
 * The one notification this half of communication needs. Nothing is sent to an
 * address a church pays for: a push goes to the browser's own service, free,
 * with no credential belonging to the church involved, which is why it is here
 * while email and SMS are not.
 *
 * Addressed one reader at a time rather than in a batch, because the link has
 * to open the conversation in the inbox that reader actually uses: the same
 * thread is "the office" to a member and "Jane Smith" to the office.
 */
export async function tellAboutMessage(
  scope: { tenantId: string; role: TenantRole; userId?: string | null },
  told: Telling,
  threadId: string,
): Promise<void> {
  /* Two of the same conversation replace each other, so a phone left in a
     drawer comes back to one line rather than nine. */
  const tag = `inbox-${threadId}`;
  const body = told.author ? `${told.author}: ${told.line}` : told.line;

  /* Grouped by where it opens rather than sent one at a time: a church thread
     reaches one member and whoever answers for the church, which is two links
     between any number of people. */
  const byLink = new Map<string, string[]>();
  for (const one of told.to) {
    const href = `${one.office ? "/messages" : "/home/messages"}/${one.key}`;
    byLink.set(href, [...(byLink.get(href) ?? []), one.userId]);
  }

  await Promise.all(
    [...byLink].map(([href, userIds]) =>
      pushTo(scope, userIds, { title: told.heading, body, href, tag })),
  );
}

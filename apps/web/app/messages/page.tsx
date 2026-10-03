import { redirect } from "next/navigation";
import {
  withTenant, listMessageTemplates, listPeople, getChurch, audienceOptions,
  listSends, canManageChurch,
} from "@hearth/db";
import { t } from "@hearth/i18n";
import { PageTitle } from "@/components/section";
import { AppHeader } from "@/components/app-header";
import { requireSession } from "@/lib/session";
import { MessagesScreen } from "./screen";

export const dynamic = "force-dynamic";

/** R16.5. The lifecycle statuses a church can write to. */
const STATUSES = ["visitor", "regular_attender", "member", "inactive"] as const;

/**
 * R16.4. The composer, and the library of messages worth sending again.
 *
 * Who a message goes to is R16.5 and the sending is R16.6. What is here is the
 * writing: the merge fields, and the message shown as one person will read it.
 */
export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  if (!canManageChurch(session.role)) redirect(`/?church=${session.tenantSlug}`);

  const actor = { tenantId: session.tenantId, role: session.role, userId: session.userId };

  const { library, sample, options, sends } = await withTenant(actor, async (tx) => {
    const profile = await getChurch(tx, session.tenantId);
    // R16.4. A real person, so the preview reads like a real message.
    const person = (await listPeople(tx, { page: 1, perPage: 1 }))[0];

    return {
      library: await listMessageTemplates(tx),
      // R16.5. What the church can pick from, each with how many it holds.
      options: await audienceOptions(tx),
      // R16.6. What has been queued and where each one got to.
      sends: await listSends(tx),
      sample: {
        first_name: person?.preferredName ?? person?.firstName ?? session.displayName,
        last_name: person?.lastName ?? "",
        full_name: person
          ? `${person.preferredName ?? person.firstName} ${person.lastName}`
          : session.displayName,
        email: person?.primaryEmail ?? session.email,
        church: profile?.name ?? session.tenantName,
      },
    };
  });

  return (
    <>
      <AppHeader session={session} />
      <main id="main" className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <PageTitle title={t("compose.title")} className="mb-8" />
        <MessagesScreen
          church={session.tenantSlug}
          library={library}
          sample={sample}
          sends={sends}
          options={{
            ...options,
            // R16.5. Lifecycle status is a fixed set rather than a table.
            statuses: STATUSES.map((status) => ({
              id: status,
              name: t(`lifecycle.${status}` as never),
              count: 0,
            })),
          }}
        />
      </main>
    </>
  );
}

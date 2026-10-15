import { notFound } from "next/navigation";
import { withTenant, liveFor, canManageServices } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { PageMeta } from "@/components/section";
import { Screen } from "@/components/screen";
import { requireScreen } from "@/lib/shell-data";
import { longDate, readableTime } from "@/lib/dates";
import { Stage } from "./stage";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ }>;
}) {
  const {} = await searchParams;
  return tabMetadata(t("live.title"));
}

/**
 * R11.11. Live mode.
 *
 * Open to anybody signed in, because the team is the audience: a musician wants
 * to know what is happening without being able to change it. The controls are
 * for whoever runs services.
 */
export default async function LivePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ }>;
}) {
  const { id } = await params;
  const {} = await searchParams;
  const session = await requireScreen();

  const live = await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions },
    (tx) => liveFor(tx, id),
  );
  if (!live) notFound();

  return (
    <Screen
      title={t("live.title")}
      back={{ href: `/services/${live.slug}`, label: live.serviceName }}
    >
      <PageMeta>{`${longDate(live.occursOn)} ${readableTime(live.startsAt)}`}</PageMeta>

      <Stage
        church={session.tenantSlug}
        /* The record's own id. Every control on this screen writes through an
           action that takes one, and what was in the address may be the
           readable address instead. */
        occurrenceId={live.occurrenceId}
        initial={live}
        canRun={canManageServices(session)}
      />
    </Screen>
  );
}

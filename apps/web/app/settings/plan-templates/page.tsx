import {
  withTenant, listTemplateShapes, canManageServices, listItemKinds,
} from "@connectapp/db";
import { kindOptions } from "@/lib/kinds";
import { requireSession } from "@/lib/session";
import { SettingsHeading } from "../heading";
import { TemplateManager } from "./template-manager";
import { Denied } from "@/components/denied";

export const dynamic = "force-dynamic";

/**
 * R11.8. The shapes this church's services run to.
 *
 * Most weeks are the same shape and different content, so the shape is a record
 * the church keeps once and lays onto a plan, rather than something that only
 * exists as a copy of a week that already happened.
 */
export default async function PlanTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);
  const manage = canManageServices(session);

  const read = manage
    ? await withTenant(
        { tenantId: session.tenantId, role: session.role },
        async (tx) => ({
          templates: await listTemplateShapes(tx),
          // R11.2. Archived kinds come too, so a line already filed under one
          // still reads by name rather than by its slug.
          kinds: kindOptions(await listItemKinds(tx, session.tenantId, { includeArchived: true })),
        }),
      )
    : { templates: [], kinds: [] };

  return (
    <div className="flex flex-col gap-5">
      <SettingsHeading title="settings.tab.plans" lede="settings.lede.plans" />

      {manage ? (
        <TemplateManager
          church={session.tenantSlug}
          templates={read.templates}
          kinds={read.kinds}
        />
      ) : (
        <Denied />
      )}
    </div>
  );
}

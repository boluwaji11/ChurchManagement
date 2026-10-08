import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  withTenant, listTemplateShapes, countArchivedTemplates, canManageServices,
  itemKindsForPlans,
} from "@connectapp/db";
import { kindOptions } from "@/lib/kinds";
import { requireSession } from "@/lib/session";
import { SettingsHeading } from "../heading";
import { TemplateManager } from "./template-manager";
import { Denied } from "@/components/denied";
import { t, plural } from "@connectapp/i18n";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  return tabMetadata(t("settings.tab.plans"), church);
}

/**
 * R11.8. The shapes this church's services run to.
 *
 * Most weeks are the same shape and different content, so the shape is a record
 * the church keeps once and lays onto a plan, rather than something that only
 * exists as a copy of a week that already happened.
 *
 * A shape that has been put away comes off this grid and sits behind the one
 * link under it, which is also the way back to bringing it out again.
 */
export default async function PlanTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string; archived?: string }>;
}) {
  const { church, archived } = await searchParams;
  const session = await requireSession(church);
  const manage = canManageServices(session);
  const putAway = archived === "1";

  const read = manage
    ? await withTenant(
        { tenantId: session.tenantId, role: session.role },
        async (tx) => ({
          templates: await listTemplateShapes(tx, putAway ? { archivedOnly: true } : {}),
          archivedCount: await countArchivedTemplates(tx),
          // R11.8. The library leaves out what this church already keeps, and
          // an archived shape still holds its name against a new one.
          taken: (await listTemplateShapes(tx, { archivedOnly: true })).map((one) => one.name),
          // R11.2. Archived kinds come too, so a line already filed under one
          // still reads by name rather than by its slug.
          kinds: kindOptions(await itemKindsForPlans(tx, { includeArchived: true })),
        }),
      )
    : { templates: [], archivedCount: 0, taken: [], kinds: [] };

  return (
    <div className="flex flex-col gap-5">
      {putAway ? (
        <Link
          href={`/settings/service-template?church=${session.tenantSlug}`}
          className="inline-flex items-center gap-1.5 self-start font-medium text-primary"
        >
          <ArrowLeft className="size-4" /> {t("planTpl.archived.back")}
        </Link>
      ) : null}

      <SettingsHeading
        title={putAway ? "planTpl.archived.title" : "settings.tab.plans"}
        lede={putAway ? undefined : "settings.lede.plans"}
      />

      {manage ? (
        <TemplateManager
          church={session.tenantSlug}
          putAway={putAway}
          templates={read.templates}
          taken={[...read.templates.map((one) => one.name), ...read.taken]}
          kinds={read.kinds}
        />
      ) : (
        <Denied role={session.role} action="manageServices" church={session.tenantSlug} />
      )}

      {!putAway && manage && read.archivedCount > 0 ? (
        <Link
          href={`/settings/service-template?church=${session.tenantSlug}&archived=1`}
          className="self-start text-label font-medium text-primary underline-offset-4 hover:underline"
        >
          {plural("planTpl.archived", read.archivedCount)}
        </Link>
      ) : null}
    </div>
  );
}

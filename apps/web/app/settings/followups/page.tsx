import { withTenant, listPipelines, assignableUsers, canManageChurch } from "@connectapp/db";
import { Banner } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { SettingsHeading } from "../heading";
import { Pipelines, NewPipeline } from "./pipelines";

export const dynamic = "force-dynamic";

/** R5.2. The six, in the church's own words. */
export default async function PipelineSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  if (!canManageChurch(session)) {
    return <Banner tone="info" title={t("pipelines.title")}>{t("forbidden.askAdmin")}</Banner>;
  }

  const { rows, team } = await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions },
    async (tx) => ({
      rows: await listPipelines(tx, { includeArchived: true }),
      team: await assignableUsers(tx),
    }),
  );

  return (
    <>
      <SettingsHeading
        title="settings.tab.followups"
        lede="settings.lede.followups"
        action={
          rows.length > 0 ? (
            <NewPipeline
              church={session.tenantSlug}
              team={team.map((member) => ({ userId: member.userId, name: member.name }))}
            />
          ) : undefined
        }
      />
      <Pipelines
        church={session.tenantSlug}
        team={team.map((member) => ({ userId: member.userId, name: member.name }))}
        rows={rows.map((row) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          hue: row.hue,
          ownerUserId: row.ownerUserId,
          archived: row.archived,
          steps: row.steps.map((step) => ({
            id: step.id, name: step.name, dueDays: step.dueDays,
          })),
        }))}
      />
    </>
  );
}

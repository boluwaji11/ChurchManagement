import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  withTenant, listPipelines, countArchivedPipelines, assignableUsers, canManageChurch,
} from "@connectapp/db";
import { requireSession } from "@/lib/session";
import { SettingsHeading } from "../heading";
import { Pipelines, NewPipeline } from "./pipelines";
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
  return tabMetadata(t("settings.tab.followups"), church);
}

/** R5.2. The six, in the church's own words. */
export default async function PipelineSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string; archived?: string }>;
}) {
  const { church, archived } = await searchParams;
  const session = await requireSession(church);

  if (!canManageChurch(session)) {
    return <Denied role={session.role} action="editChurch" church={session.tenantSlug} />;
  }

  const putAway = archived === "1";

  const { rows, team, archivedCount } = await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions },
    async (tx) => ({
      rows: await listPipelines(tx, putAway ? { archivedOnly: true } : {}),
      team: await assignableUsers(tx),
      archivedCount: await countArchivedPipelines(tx),
    }),
  );

  return (
    <>
      {putAway ? (
        <Link
          href={`/settings/followups?church=${session.tenantSlug}`}
          className="inline-flex items-center gap-1.5 self-start font-medium text-primary"
        >
          <ArrowLeft className="size-4" /> {t("pipelines.archived.back")}
        </Link>
      ) : null}

      <SettingsHeading
        title={putAway ? "pipelines.archived.title" : "settings.tab.followups"}
        lede={putAway ? undefined : "settings.lede.followups"}
        action={
          !putAway && rows.length > 0 ? (
            <NewPipeline
              church={session.tenantSlug}
              team={team.map((member) => ({ userId: member.userId, name: member.name }))}
              taken={rows.map((one) => one.name)}
            />
          ) : undefined
        }
      />
      <Pipelines
        church={session.tenantSlug}
        putAway={putAway}
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

      {!putAway && archivedCount > 0 ? (
        <Link
          href={`/settings/followups?church=${session.tenantSlug}&archived=1`}
          className="self-start text-label font-medium text-primary underline-offset-4 hover:underline"
        >
          {plural("pipelines.archived", archivedCount)}
        </Link>
      ) : null}
    </>
  );
}

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  withTenant, listGroupTypes, countArchivedGroupTypes, groupTypeCounts, canManageGroups,
} from "@connectapp/db";
import { requireSession } from "@/lib/session";
import { SettingsHeading } from "../heading";
import { TypeManager } from "./type-manager";
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
  return tabMetadata(t("settings.tab.grouptypes"), church);
}

/**
 * R9.1. The kinds of group this church runs.
 *
 * Configurable rather than a fixed list, because a church that calls its small
 * groups "life groups" and runs a "prayer chain" should not have to answer to
 * our vocabulary. The colour is the one its groups wear on every card, every
 * filter and every date tile.
 *
 * A kind that has been put away comes off this grid and sits behind the one
 * link under it, which is also the way back to bringing it out again.
 */
export default async function GroupTypesPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string; archived?: string }>;
}) {
  const { church, archived } = await searchParams;
  const session = await requireSession(church);
  const manage = canManageGroups(session);
  const putAway = archived === "1";

  const { types, counts, archivedCount, taken } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => ({
      types: await listGroupTypes(tx, putAway ? { archivedOnly: true } : {}),
      counts: await groupTypeCounts(tx),
      archivedCount: await countArchivedGroupTypes(tx),
      // R9.1. The library leaves out what this church already keeps, and an
      // archived kind still holds its name against a new one.
      taken: (await listGroupTypes(tx, { includeArchived: true })).map((one) => one.name),
    }),
  );

  return (
    <div className="flex flex-col gap-5">
      {putAway ? (
        <Link
          href={`/settings/group-types?church=${session.tenantSlug}`}
          className="inline-flex items-center gap-1.5 self-start font-medium text-primary"
        >
          <ArrowLeft className="size-4" /> {t("groupType.archived.back")}
        </Link>
      ) : null}

      <SettingsHeading
        title={putAway ? "groupType.archived.title" : "settings.tab.grouptypes"}
        lede={putAway ? undefined : "settings.lede.grouptypes"}
      />

      {manage ? (
        <TypeManager
          church={session.tenantSlug}
          putAway={putAway}
          taken={taken}
          types={types.map((one) => ({
            id: one.id,
            name: one.name,
            description: one.description,
            hue: one.hue,
            archived: one.archivedAt !== null,
            groups: counts[one.id] ?? 0,
          }))}
        />
      ) : (
        <Denied role={session.role} action="manageGroups" church={session.tenantSlug} />
      )}

      {!putAway && manage && archivedCount > 0 ? (
        <Link
          href={`/settings/group-types?church=${session.tenantSlug}&archived=1`}
          className="self-start text-label font-medium text-primary underline-offset-4 hover:underline"
        >
          {plural("groupType.archived", archivedCount)}
        </Link>
      ) : null}
    </div>
  );
}

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  withTenant, listItemKinds, countArchivedItemKinds, canManageServices, BUILT_IN_KINDS,
} from "@connectapp/db";
import { t, plural } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { SettingsHeading } from "../heading";
import { KindManager } from "./kind-manager";
import { Denied } from "@/components/denied";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  return tabMetadata(t("settings.tab.kinds"), church);
}

/**
 * R11.2. What this church puts on a plan.
 *
 * The eight were ours, which is our vocabulary rather than the church's. A
 * congregation that runs a testimony every week writes it down here, and the
 * word it chooses is the word the whole order of service reads.
 *
 * A kind that has been put away comes off this grid and sits behind the one
 * link under it, which is also the way back to bringing it out again.
 */
export default async function ItemKindsPage({
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
          rows: await listItemKinds(tx, putAway ? { archivedOnly: true } : {}),
          archivedCount: await countArchivedItemKinds(tx),
          // R11.2. The library leaves out what this church already keeps, and
          // an archived kind still holds its slug against a new one.
          taken: (await listItemKinds(tx, { includeArchived: true })).map((one) => one.slug),
        }),
      )
    : { rows: [], archivedCount: 0, taken: [] };

  const ours = BUILT_IN_KINDS as readonly string[];

  return (
    <div className="flex flex-col gap-5">
      {putAway ? (
        <Link
          href={`/settings/service-type?church=${session.tenantSlug}`}
          className="inline-flex items-center gap-1.5 self-start font-medium text-primary"
        >
          <ArrowLeft className="size-4" /> {t("itemKind.archived.back")}
        </Link>
      ) : null}

      <SettingsHeading
        title={putAway ? "itemKind.archived.title" : "settings.tab.kinds"}
        lede={putAway ? undefined : "settings.lede.kinds"}
      />

      {manage ? (
        <KindManager
          church={session.tenantSlug}
          putAway={putAway}
          taken={read.taken}
          kinds={read.rows.map((row) => ({
            id: row.id,
            slug: row.slug,
            name: row.name ?? (ours.includes(row.slug) ? t(`order.kind.${row.slug}` as never) : row.slug),
            archived: row.archived,
          }))}
        />
      ) : (
        <Denied role={session.role} action="manageServices" church={session.tenantSlug} />
      )}

      {!putAway && manage && read.archivedCount > 0 ? (
        <Link
          href={`/settings/service-type?church=${session.tenantSlug}&archived=1`}
          className="self-start text-label font-medium text-primary underline-offset-4 hover:underline"
        >
          {plural("itemKind.archived", read.archivedCount)}
        </Link>
      ) : null}
    </div>
  );
}

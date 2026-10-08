import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  withTenant, listAnnouncements, countArchivedAnnouncements, getChurch, canManageChurch,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { longDate } from "@/lib/dates";
import { Denied } from "@/components/denied";
import { SettingsHeading } from "../heading";
import { Announcements, type AnnouncementRow } from "./manager";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  return tabMetadata(t("announce.title"), church);
}

/**
 * R16.11. What a church tells everybody.
 *
 * The part of communication that holds no credentials and sends nothing: it
 * is written here and read in the member's own portal.
 */
export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string; archived?: string }>;
}) {
  const { church, archived } = await searchParams;
  const session = await requireSession(church);
  const putAway = archived === "1";

  if (!canManageChurch(session)) {
    return (
      <>
        <SettingsHeading title="announce.title" lede="announce.lede" />
        <Denied role={session.role} action="editChurch" church={session.tenantSlug} />
      </>
    );
  }

  const read = await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId },
    async (tx) => {
      const profile = await getChurch(tx, session.tenantId);
      return {
        today: churchNow(profile?.timezone ?? "America/Chicago").date,
        rows: await listAnnouncements(tx, { archivedOnly: putAway }),
        putAwayCount: await countArchivedAnnouncements(tx),
      };
    },
  );

  /* R22.8. The dates are written here, in the church's own way of writing
     one, because a client component reads a locale the browser has not
     resolved on its first render. */
  const rows: AnnouncementRow[] = read.rows.map((one) => ({
    id: one.id,
    title: one.title,
    body: one.body,
    hue: one.hue,
    pinned: one.pinned,
    published: one.publishedAt
      ? t("announce.publishedOn", { date: longDate(one.publishedAt.toISOString().slice(0, 10)) })
      : null,
    expires: one.expiresOn ? t("announce.expiresOn", { date: longDate(one.expiresOn) }) : null,
    expiresOn: one.expiresOn,
    gone: Boolean(one.expiresOn && one.expiresOn < read.today),
    archived: one.archived,
  }));

  return (
    <div className="flex flex-col gap-5">
      <SettingsHeading
        title={putAway ? "announce.archived.title" : "announce.title"}
        lede={putAway ? undefined : "announce.lede"}
      />

      {putAway ? (
        <Link
          href={`/settings/announcements?church=${session.tenantSlug}`}
          className="flex min-h-[var(--d-tap)] items-center gap-1.5 self-start font-medium text-primary [&_svg]:size-4"
        >
          <ArrowLeft aria-hidden /> {t("announce.title")}
        </Link>
      ) : null}

      <Announcements church={session.tenantSlug} rows={rows} putAway={putAway} />

      {/* R24.6. The same link every screen with archiving carries. */}
      {!putAway && read.putAwayCount > 0 ? (
        <Link
          href={`/settings/announcements?church=${session.tenantSlug}&archived=1`}
          className="flex min-h-[var(--d-tap)] items-center self-start font-medium text-primary"
        >
          {t("announce.archived.link")}
        </Link>
      ) : null}
    </div>
  );
}

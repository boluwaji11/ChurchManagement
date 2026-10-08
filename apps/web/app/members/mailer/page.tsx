import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  withTenant, postalRows, listSavedLists, listMailers, countArchivedMailers, getMailer,
  canEditPeople,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
import { Denied } from "@/components/denied";
import { requireSession } from "@/lib/session";
import { readingLocale } from "@/lib/reading-locale";
import { Mailer } from "./mailer";
import { Shelf } from "./shelf";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  return tabMetadata(t("post.title"), church);
}

/** When a mailer was last written to, in the church's own format. */
const stamp = (at: Date): string =>
  at.toLocaleString(readingLocale(), {
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  });

/**
 * R16.12. What a church posts.
 *
 * Churches print far more than software vendors expect, and a church with no
 * way to print a label types the whole directory into Word once a year. This
 * is the other half of communication: the half that needs no provider,
 * carries no credentials and sends nothing.
 *
 * The screen opens on the mailers already being written. One of them is
 * chosen, or a new one is named, and then the letter is written in a screen
 * that saves itself.
 */
export default async function MailerPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string; open?: string; archived?: string }>;
}) {
  const { church, open: id, archived } = await searchParams;
  /** R24.6. The ones put away, reached from the shelf they came off. */
  const putAway = archived === "1";
  const session = await requireSession(church);

  if (!canEditPeople(session)) {
    return (
      <AppShell session={session} title={t("post.title")}>
        <Denied role={session.role} action="editPerson" church={session.tenantSlug} />
      </AppShell>
    );
  }

  const ctx = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };

  const read = await withTenant(ctx, async (tx) => ({
    households: id ? (await postalRows(tx)).length : 0,
    lists: id ? await listSavedLists(tx) : [],
    mailers: id ? [] : await listMailers(tx, putAway ? { archivedOnly: true } : {}),
    archivedCount: id ? 0 : await countArchivedMailers(tx),
    open: id ? await getMailer(tx, id) : null,
  }));

  if (id && !read.open) notFound();

  const back = (
    <Link
      href={
        id || putAway
          ? `/members/mailer?church=${session.tenantSlug}`
          : `/members?church=${session.tenantSlug}`
      }
      className="flex min-h-[var(--d-tap)] items-center gap-1.5 self-start font-medium text-primary [&_svg]:size-4"
    >
      <ArrowLeft aria-hidden /> {id || putAway ? t("post.title") : t("members.title")}
    </Link>
  );

  return (
    <AppShell
      session={session}
      title={read.open ? read.open.name : putAway ? t("post.archived.title") : t("post.title")}
    >
      <div className="flex flex-col gap-6">
        {back}

        {read.open ? (
          <Mailer
            church={session.tenantSlug}
            households={read.households}
            lists={read.lists.map((one) => ({ id: one.id, name: one.name }))}
            saved={{
              id: read.open.id,
              name: read.open.name,
              recipients: read.open.recipients,
              listId: read.open.listId,
              paper: read.open.paper,
              skip: read.open.skip,
              font: read.open.font,
              fontSize: read.open.fontSize,
              body: read.open.body,
            }}
          />
        ) : (
          <Shelf
            church={session.tenantSlug}
            putAway={putAway}
            archivedCount={read.archivedCount}
            mailers={read.mailers.map((one) => ({
              id: one.id,
              slug: one.slug,
              name: one.name,
              when: stamp(one.updatedAt),
            }))}
          />
        )}
      </div>
    </AppShell>
  );
}

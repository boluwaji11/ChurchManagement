import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  withTenant, postalRows, listSavedLists, listMailers, countArchivedMailers, getMailer,
  canEditPeople,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { Denied } from "@/components/denied";
import { requireSession } from "@/lib/session";
import { readingLocale } from "@/lib/reading-locale";
import { Mailer } from "./mailer";
import { Shelf } from "./shelf";
import { tabMetadata } from "@/lib/page-metadata";
import { ScreenPanel } from "../screen-panel";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ }>;
}) {
  const {} = await searchParams;
  return tabMetadata(t("post.title"));
}

/** When a mailer was last written to, in the church's own format. */
const stamp = (at: Date): string =>
  at.toLocaleString(readingLocale(), {
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  });

type MailerPageProps = {
  searchParams: Promise<{ open?: string; archived?: string }>;
};

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
export async function MailerPanelPage({
  searchParams,
}: {
  searchParams: MailerPageProps["searchParams"];
}) {
  const { open: id, archived } = await searchParams;
  /** R24.6. The ones put away, reached from the shelf they came off. */
  const putAway = archived === "1";
  const session = await requireSession();

  if (!canEditPeople(session)) {
    const denied = (
      <Denied role={session.role} action="editPerson" church={session.tenantSlug} />
    );
    return <ScreenPanel title={t("post.title")}>{denied}</ScreenPanel>;
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

  const title = read.open
    ? read.open.name
    : putAway
      ? t("post.archived.title")
      : t("post.title");

  const body = read.open ? (
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
      putAway={putAway}
      archivedCount={read.archivedCount}
      mailers={read.mailers.map((one) => ({
        id: one.id,
        slug: one.slug,
        name: one.name,
        when: stamp(one.updatedAt),
      }))}
    />
  );

  const toShelf = Boolean(id) || putAway;
  const back = (
    <Link
      href={toShelf ? "/members/mailer" : "/members"}
      className="flex min-h-[var(--d-tap)] items-center gap-1.5 self-start font-medium text-primary [&_svg]:size-4"
    >
      <ArrowLeft aria-hidden /> {toShelf ? t("post.title") : t("members.title")}
    </Link>
  );

  return (
      <ScreenPanel title={title}>
        {/* R24.6. The directory is behind the close square, so the only step
            back worth drawing is the one from a letter to the shelf. */}
        {toShelf ? back : null}
        {body}
      </ScreenPanel>
  );
}

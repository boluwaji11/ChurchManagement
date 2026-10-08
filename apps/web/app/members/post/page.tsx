import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  withTenant, postalRows, listSavedLists, canEditPeople,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
import { Denied } from "@/components/denied";
import { requireSession } from "@/lib/session";
import { Labels } from "./labels";
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

/**
 * R16.12. What a church posts.
 *
 * Churches print far more than software vendors expect, and a church with no
 * way to print a label types the whole directory into Word once a year. This
 * is the other half of communication: the half that needs no provider,
 * carries no credentials and sends nothing.
 */
export default async function PostPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  if (!canEditPeople(session)) {
    return (
      <AppShell session={session} title={t("post.title")}>
        <Denied role={session.role} action="editPerson" church={session.tenantSlug} />
      </AppShell>
    );
  }

  const read = await withTenant(
    {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      permissions: session.permissions,
    },
    async (tx) => ({
      households: (await postalRows(tx)).length,
      lists: await listSavedLists(tx),
    }),
  );

  return (
    <AppShell session={session} title={t("post.title")}>
      <div className="flex flex-col gap-6">
        <Link
          href={`/members?church=${session.tenantSlug}`}
          className="flex min-h-[var(--d-tap)] items-center gap-1.5 self-start font-medium text-primary [&_svg]:size-4"
        >
          <ArrowLeft aria-hidden /> {t("members.title")}
        </Link>

        <Labels
          church={session.tenantSlug}
          households={read.households}
          lists={read.lists.map((one) => ({ id: one.id, name: one.name }))}
        />
      </div>
    </AppShell>
  );
}

import { withTenant, listGroupTypes, canManageGroups } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { GroupEditor, GroupFormActions } from "../group-editor";
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
  return tabMetadata(t("groups.newTitle"), church);
}

/**
 * R9.1, R9.2. Writing a group down.
 *
 * Its own page rather than a dialog: a group answers fourteen questions, and a
 * box that tall is a box nobody reads the bottom of.
 */
export default async function NewGroupPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string; type?: string }>;
}) {
  const { church, type } = await searchParams;
  const session = await requireSession(church);

  // The form is hidden from a role that cannot use it. The refusal that matters
  // is in the repository, which rejects the write even if this page is bypassed.
  const permitted = canManageGroups(session);

  const types = permitted
    ? await withTenant(
        { tenantId: session.tenantId, role: session.role },
        (tx) => listGroupTypes(tx),
      )
    : [];

  /* R9.1. The kind it was started from: the form opens on it, and the way
     back out returns to that list rather than to all of them. */
  const from = type ? types.find((one) => one.slug === type || one.id === type) : undefined;

  return (
    <AppShell
      session={session}
      tab={t("groups.newTitle")}
      max="max-w-[1080px]"
      back={{
        href: `/groups?church=${session.tenantSlug}${from ? `&type=${from.slug ?? from.id}` : ""}`,
        label: from?.name ?? t("groups.title"),
      }}
      action={permitted ? <GroupFormActions editing={false} /> : undefined}
    >
      <h1 className="font-display text-[32px] leading-[38px] text-fg">{t("groups.newTitle")}</h1>

      {permitted ? (
        <GroupEditor
          church={session.tenantSlug}
          types={types.map((one) => ({ id: one.id, name: one.name, hue: one.hue }))}
          ofType={from?.id}
        />
      ) : (
        <Denied role={session.role} action="manageGroups" church={session.tenantSlug} />
      )}
    </AppShell>
  );
}

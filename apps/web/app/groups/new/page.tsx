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

  /*
   * R9.1. The list it was started from.
   *
   * A kind, and then the form opens on it; or the one that holds every group,
   * and then it only decides where the way back out goes. Either way somebody
   * lands back on the screen they pressed from rather than one above it.
   */
  const from = type && type !== "all"
    ? types.find((one) => one.slug === type || one.id === type)
    : undefined;
  const backTo = type
    ? `/groups?church=${session.tenantSlug}&type=${from ? (from.slug ?? from.id) : type}`
    : `/groups?church=${session.tenantSlug}`;

  return (
    <AppShell
      session={session}
      tab={t("groups.newTitle")}
      max="max-w-[1080px]"
      back={{ href: backTo, label: from?.name ?? t("groups.title") }}
      action={permitted ? <GroupFormActions editing={false} /> : undefined}
    >
      <h1 className="font-display text-[32px] leading-[38px] text-fg">
        {from ? t("groups.newOf", { type: from.name }) : t("groups.newTitle")}
      </h1>

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

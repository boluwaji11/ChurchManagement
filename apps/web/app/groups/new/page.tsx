import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { withTenant, listGroupTypes, canManageGroups } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { GroupEditor, GroupFormActions } from "../group-editor";
import { Denied } from "@/components/denied";

export const dynamic = "force-dynamic";

/**
 * R9.1, R9.2. Writing a group down.
 *
 * Its own page rather than a dialog: a group answers fourteen questions, and a
 * box that tall is a box nobody reads the bottom of.
 */
export default async function NewGroupPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
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

  return (
    <AppShell session={session} tab={t("groups.newTitle")} max="max-w-[1080px]">
      <div className="flex items-center gap-3">
        <Link
          href={`/groups?church=${session.tenantSlug}`}
          className="inline-flex items-center gap-1.5 font-medium text-primary"
        >
          <ArrowLeft className="size-4" /> {t("groups.title")}
        </Link>
        <span className="flex-1" />
        {permitted ? <GroupFormActions editing={false} /> : null}
      </div>

      <h1 className="font-display text-[32px] leading-[38px] text-fg">{t("groups.newTitle")}</h1>

      {permitted ? (
        <GroupEditor
          church={session.tenantSlug}
          types={types.map((one) => ({ id: one.id, name: one.name, hue: one.hue }))}
        />
      ) : (
        <Denied />
      )}
    </AppShell>
  );
}

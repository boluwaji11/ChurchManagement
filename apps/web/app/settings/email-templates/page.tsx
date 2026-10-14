import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  withTenant, listEmailTemplates, countArchivedEmailTemplates, canManageChurch,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { Denied } from "@/components/denied";
import { SettingsHeading } from "../heading";
import { TemplateList } from "./template-list";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata() {
  return tabMetadata(t("mailTemplate.title"));
}

/**
 * HRT-291, R16.4. The messages a church writes once.
 *
 * Beside the service templates in spirit, in the church's own section here
 * because it belongs with how the church speaks for itself. The composer
 * starts from one; nothing on this screen sends anything.
 */
export default async function EmailTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const { archived } = await searchParams;
  const session = await requireSession();
  const manage = canManageChurch(session);
  const putAway = archived === "1";

  const read = manage
    ? await withTenant(
        { tenantId: session.tenantId, role: session.role },
        async (tx) => ({
          templates: await listEmailTemplates(tx, { archived: putAway }),
          archived: await countArchivedEmailTemplates(tx),
        }),
      )
    : { templates: [], archived: 0 };

  return (
    <div className="flex flex-col gap-5">
      {putAway ? (
        <Link
          href="/settings/email-templates"
          className="inline-flex items-center gap-1.5 self-start font-medium text-primary"
        >
          <ArrowLeft className="size-4" /> {t("mailTemplate.live")}
        </Link>
      ) : null}

      <SettingsHeading
        title={putAway ? "mailTemplate.archived" : "mailTemplate.title"}
        lede={putAway ? undefined : "mailTemplate.lede"}
      />

      {manage ? (
        <TemplateList putAway={putAway} templates={read.templates} />
      ) : (
        <Denied role={session.role} action="editChurch" church={session.tenantSlug} />
      )}

      {!putAway && manage && read.archived > 0 ? (
        <Link
          href="/settings/email-templates?archived=1"
          className="self-start text-label font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("mailTemplate.archived")}
        </Link>
      ) : null}
    </div>
  );
}

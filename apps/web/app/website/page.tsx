import {
  withTenant, canManageWebsite, websiteForEditor, listServiceTimes, isApproved, getChurch,
} from "@connectapp/db";
import { requireScreen } from "@/lib/shell-data";
import { Denied } from "@/components/denied";
import { AppShell } from "@/components/app-shell";
import { tabMetadata } from "@/lib/page-metadata";
import { t } from "@connectapp/i18n";
import { WebsiteEditor } from "./website-editor";
import { signWebsiteMedia } from "@/lib/website-media";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return tabMetadata(t("website.title"));
}

export default async function WebsiteEditorPage() {
  const session = await requireScreen();
  if (!canManageWebsite(session)) {
    return <Denied role={session.role} action="manageWebsite" church={session.tenantSlug} />;
  }

  const context = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };
  const [website, services, approved, church] = await withTenant(context, async (tx) =>
    Promise.all([
      websiteForEditor(tx),
      listServiceTimes(tx),
      isApproved(tx, session.tenantId),
      getChurch(tx, session.tenantId, session),
    ]),
  );
  const editorWebsite = website ? await signWebsiteMedia(website) : null;

  return (
    <AppShell session={session} title={t("website.title")} wide>
      <WebsiteEditor
        churchName={session.tenantName}
        country={session.tenantCountry}
        brandHue={church?.brandHue ?? "indigo"}
        website={editorWebsite}
        services={services}
        approved={approved}
      />
    </AppShell>
  );
}

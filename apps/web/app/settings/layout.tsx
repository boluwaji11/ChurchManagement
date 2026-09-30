import { canManageChurch, canManageCustomFields, canEditPeople } from "@hearth/db";
import { t } from "@hearth/i18n";
import { Avatar } from "@hearth/ui";
import { requireSession } from "@/lib/session";
import { AppHeader } from "@/components/app-header";
import { SettingsTabs, type SettingsTab } from "./tabs";

export const dynamic = "force-dynamic";

/**
 * Everything a person administers, behind their own name.
 *
 * Tags and custom fields used to sit in the main navigation beside the
 * directory, which put the two things a volunteer touches every day next to two
 * they touch twice a year. The directory is the product. This is the drawer.
 */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  const tabs: SettingsTab[] = [
    { href: "/settings", label: t("settings.tab.account") },
    { href: "/settings/security", label: t("settings.tab.security") },
    ...(canManageChurch(session.role)
      ? [{ href: "/settings/church", label: t("settings.tab.church") }]
      : []),
    ...(canEditPeople(session.role)
      ? [{ href: "/settings/tags", label: t("settings.tab.tags") }]
      : []),
    ...(canManageCustomFields(session.role)
      ? [{ href: "/settings/fields", label: t("settings.tab.fields") }]
      : []),
  ];

  return (
    <>
      <AppHeader session={session} />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center gap-4">
          <Avatar name={session.displayName} id={session.userId} size="xl" />
          <div className="flex flex-col gap-0.5">
            <h1 className="font-display text-display text-fg">{session.displayName}</h1>
            <p className="text-body-lg text-fg-muted">{session.tenantName}</p>
          </div>
        </div>

        <SettingsTabs tabs={tabs} church={session.tenantSlug} />

        {children}
      </main>
    </>
  );
}

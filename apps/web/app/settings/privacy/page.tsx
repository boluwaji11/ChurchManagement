import { withTenant, personForUser, directoryPreferencesFor, householdHeadIs } from "@hearth/db";
import { Banner } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { requireSession } from "@/lib/session";
import { Privacy } from "./privacy";

export const dynamic = "force-dynamic";

/** R3.2, R3.3. My own entry in the church's directory. */
export default async function DirectoryPrivacyPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  const result = await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId },
    async (tx) => {
      const self = await personForUser(tx, session.userId);
      if (!self) return null;
      return {
        values: await directoryPreferencesFor(tx, self),
        isHead: await householdHeadIs(tx, self),
      };
    },
  );

  if (!result) {
    return <Banner tone="info" title={t("privacy.noRecord")} />;
  }

  return (
    <Privacy
      church={session.tenantSlug}
      isHead={result.isHead}
      values={{
        listed: result.values.listed,
        showEmail: result.values.showEmail,
        showPhone: result.values.showPhone,
        showAddress: result.values.showAddress,
        showBirthday: result.values.showBirthday,
        showPhoto: result.values.showPhoto,
        showChildren: result.values.showChildren,
      }}
    />
  );
}

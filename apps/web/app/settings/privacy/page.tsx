import {
  withTenant, personForUser, directoryPreferencesFor, householdHeadIs,
  getPerson, getPersonForEdit, addressFor, householdFor,
} from "@hearth/db";
import { Banner } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { requireSession } from "@/lib/session";
import { SettingsHeading } from "../heading";
import { Privacy } from "./privacy";
import { shortDate } from "@/lib/dates";

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
    { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions },
    async (tx) => {
      const self = await personForUser(tx, session.userId);
      if (!self) return null;
      const person = await getPerson(tx, self, { role: session.role, userId: session.userId });
      const household = await householdFor(tx, self);
      return {
        values: await directoryPreferencesFor(tx, self),
        isHead: await householdHeadIs(tx, self),
        personId: self,
        name: person ? `${person.preferredName ?? person.firstName} ${person.lastName}` : "",
        dateOfBirth: person?.dateOfBirth ?? null,
        contact: await getPersonForEdit(tx, self),
        address: await addressFor(tx, self),
        household,
      };
    },
  );

  if (!result) {
    return <Banner tone="info" title={t("privacy.noRecord")} />;
  }

  return (
    <>
      <SettingsHeading title="settings.title.privacy" lede="settings.lede.privacy" />
      <Privacy
        church={session.tenantSlug}
        isHead={result.isHead}
        details={{
          personId: result.personId,
          name: result.name,
          email: result.contact?.email ?? null,
          phone: result.contact?.phone ?? null,
          address: result.address,
          birthday: result.dateOfBirth ? shortDate(result.dateOfBirth) : null,
          // R3.3. The household's children, by name, which is what the switch
          // publishes when the head of the household turns it on.
          children:
            result.household?.members
              .filter((one) => one.role === "child")
              .map((one) => one.displayName)
              .join(", ") || null,
        }}
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
    </>
  );
}

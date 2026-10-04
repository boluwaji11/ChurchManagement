import {
  withTenant, personForUser, getPerson, getPersonForEdit,
} from "@hearth/db";
import { Banner } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { requireSession } from "@/lib/session";
import { SettingsHeading } from "../heading";
import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

/**
 * R17.1. The one screen about the person reading it.
 *
 * Their own record in the church's directory, edited in place. What is saved
 * here is what the church holds, so a corrected phone number is corrected
 * everywhere rather than in a copy only this screen knows about.
 */
export default async function ProfilePage({
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
      const contact = await getPersonForEdit(tx, self);
      return { personId: self, person, contact };
    },
  );

  return (
    <>
      <SettingsHeading title="settings.title.profile" lede="settings.lede.profile" />

      {result?.person ? (
        <section className="rounded-[14px] border border-line bg-surface p-5">
          <ProfileForm
            church={session.tenantSlug}
            signedInAs={session.email}
            role={t(`role.${session.role}` as never)}
            churchName={session.tenantName}
            values={{
              personId: result.personId,
              firstName: result.person.firstName,
              lastName: result.person.lastName,
              preferredName: result.person.preferredName ?? "",
              email: result.contact?.email ?? "",
              phone: result.contact?.phone ?? "",
              dateOfBirth: result.person.dateOfBirth ?? "",
            }}
          />
        </section>
      ) : (
        <Banner tone="info" title={t("settings.title.profile")}>
          {t("settings.profile.noRecord")}
        </Banner>
      )}
    </>
  );
}

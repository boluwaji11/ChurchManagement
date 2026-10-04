import {
  withTenant, personForUser, getPerson, getPersonForEdit,
} from "@hearth/db";
import { Banner } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { requireSession } from "@/lib/session";
import { SettingsHeading } from "../heading";
import { ProfileForm } from "./profile-form";
import { supabaseServer } from "@/lib/supabase/server";

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
      return { personId: self, person, contact, photoKey: person?.photoKey ?? null };
    },
  );

  /*
   * The bucket is private, so a face is served through a signed URL with an
   * hour on it. Every settings screen is force-dynamic, so a reader who leaves
   * a tab open overnight gets a fresh one on their next navigation.
   */
  let photoUrl: string | null = null;
  if (result?.photoKey) {
    const supabase = await supabaseServer();
    const signed = await supabase.storage.from("church").createSignedUrl(result.photoKey, 3600);
    photoUrl = signed.data?.signedUrl ?? null;
  }

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
            photoUrl={photoUrl}
            values={{
              personId: result.personId,
              firstName: result.person.firstName,
              lastName: result.person.lastName,
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

import {
  withTenant, personForUser, getPerson, getPersonForEdit, listCampuses, anniversaryOf,
} from "@hearth/db";
import { Banner } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { cookies } from "next/headers";
import { requireSession } from "@/lib/session";
import { SettingsHeading } from "../heading";
import { ProfileForm } from "./profile-form";
import { toAddress } from "@/lib/address";
import { ThemeChoice } from "../theme";
import type { Theme } from "../theme-actions";
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
  const theme = ((await cookies()).get("hearth-theme")?.value ?? "system") as Theme;

  const result = await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions },
    async (tx) => {
      const self = await personForUser(tx, session.userId);
      if (!self) return null;
      const person = await getPerson(tx, self, { role: session.role, userId: session.userId });
      const contact = await getPersonForEdit(tx, self);
      return {
        memberId: self,
        person,
        contact,
        campuses: await listCampuses(tx),
        anniversary: await anniversaryOf(tx, self),
        photoKey: person?.photoKey ?? null,
      };
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
            photoUrl={photoUrl}
            campuses={result.campuses.map((one) => ({ id: one.id, name: one.name }))}
            values={{
              memberId: result.memberId,
              firstName: result.person.firstName,
              lastName: result.person.lastName,
              phone: result.contact?.phone ?? "",
              dateOfBirth: result.person.dateOfBirth ?? "",
              address: toAddress(result.contact?.address as never),
              maritalStatus: result.person.maritalStatus,
              schoolLevel: result.person.schoolLevel,
              anniversary: result.anniversary ?? "",
              campusId: result.person.campusId,
            }}
          />
        </section>
      ) : (
        <Banner tone="info" title={t("settings.title.profile")}>
          {t("settings.profile.noRecord")}
        </Banner>
      )}

      {/* R1.6. Which church somebody is signed in to and what they may do in
          it. Neither is theirs to change, so it sits outside the card the
          pencil opens. */}
      <section className="flex flex-col gap-1 rounded-[14px] border border-line bg-surface p-5">
        <span className="text-[15px] font-bold text-fg">{t("settings.profile.church")}</span>
        <span className="text-[length:var(--d-text-body)] text-fg">{session.tenantName}</span>
        <span className="text-[13px] text-fg-muted">
          {t("settings.profile.roleIs", { role: t(`role.${session.role}` as never) })}
        </span>
      </section>

      {/* R24.x. Light, dark, or whatever this device is set to. It lived on a
          menu item of its own for one row of three buttons. */}
      <section className="flex flex-col gap-3 rounded-[14px] border border-line bg-surface p-5">
        <span className="text-[15px] font-bold text-fg">{t("settings.tab.appearance")}</span>
        <ThemeChoice current={theme} />
      </section>
    </>
  );
}

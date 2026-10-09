import { themeFor } from "@connectapp/db";
import {
  withTenant, personForUser, getPerson, getPersonForEdit, listCampuses, anniversaryOf,
  listCustomFields, getCustomValues,
} from "@connectapp/db";
import { Banner } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { Church, SunMoon } from "lucide-react";
import { SettingsHeading } from "../heading";
import { SettingCard, Details, Detail } from "../card";
import { ProfileForm } from "./profile-form";
import { toAddress } from "@/lib/address";
import { ThemeChoice } from "../theme";
import { NotifyChoice } from "@/components/shell/notify-choice";
import type { Theme } from "../theme-actions";
import { supabaseServer } from "@/lib/supabase/server";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  return tabMetadata(t("settings.tab.profile"), church);
}

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
  /* R24.x. What they chose, from their account rather than from this
     browser, so the card answers the same on every device they sign in on. */
  const theme = ((await themeFor(session.userId)) ?? "system") as Theme;

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
        /* R1.10, R17.1. Whatever this church asks about its people. The
           ones it marked as theirs to change are theirs to change here. */
        customFields: await listCustomFields(tx, "person"),
        customValues: await getCustomValues(tx, "person", self),
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
        <section className="rounded-[14px] border border-line bg-surface p-5 shadow-sm">
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
              anniversary: result.anniversary ?? "",
              campusId: result.person.campusId,
            }}
            customFields={result.customFields.map((one) => ({
              id: one.id,
              label: one.label,
              type: one.type,
              options: one.options,
              memberEditable: one.memberEditable,
            }))}
            customValues={result.customValues}
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
      <SettingCard
        icon={<Church />}
        title={t("settings.profile.church")}
        lede={session.tenantName}
      >
        <Details>
          <Detail label={t("settings.profile.churchName")}>{session.tenantName}</Detail>
          <Detail label={t("settings.profile.role")}>
            {t(`role.${session.role}` as never)}
          </Detail>
        </Details>
      </SettingCard>

      {/* R24.x, R16.10. What somebody settles once: how the product is drawn,
          and whether this browser tells them when something arrives. Both were
          elsewhere, one on a menu of its own and one in the sidebar. */}
      <SettingCard icon={<SunMoon />} title={t("settings.preferences")}>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            {/* The same label every other field on this screen carries. */}
            <span className="text-[12px] font-medium tracking-[0.02em] text-fg-subtle uppercase">{t("settings.pref.appearance")}</span>
            <ThemeChoice current={theme} />
          </div>

          <NotifyChoice church={session.tenantSlug} />
        </div>
      </SettingCard>
    </>
  );
}

import {
  withTenant, personForUser, directoryPreferencesFor, householdHeadIs,
  getPerson, getPersonForEdit, addressFor, householdFor,
} from "@hearth/db";
import { Avatar, Banner, Button } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { requireSession } from "@/lib/session";
import { SettingsHeading } from "../heading";
import { DirectoryEntry } from "./directory";
import { shortDate } from "@/lib/dates";
import Link from "next/link";

export const dynamic = "force-dynamic";

/**
 * R3.2, R3.3. The one screen about the person reading it.
 *
 * Who they are signed in as, the record the church holds for them, and the
 * switches that decide what other members see. The switches are not covered by
 * roles: a role decides what staff may open, and this decides what the member
 * sitting next to them in a service can look up.
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
      <SettingsHeading title="settings.title.profile" lede="settings.lede.profile" />

      {/* R17.1. Read-only for now. Editing your own details is the member
          portal's job and has not been built, so this says what the church
          holds rather than pretending to take a change. */}
      <section className="flex flex-col gap-4 rounded-[14px] border border-line bg-surface p-5">
        <h3 className="text-[15px] font-bold text-fg">{t("settings.profile.you")}</h3>

        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={result.name} id={result.personId} className="size-12 text-[16px] font-semibold" />
          <div className="min-w-0 flex-1">
            <div className="font-medium text-fg">{result.name}</div>
            <div className="text-[13px] text-fg-muted">{session.email}</div>
          </div>
          <Button variant="secondary" asChild>
            <Link href={`/people/${result.personId}?church=${session.tenantSlug}`}>
              {t("settings.profile.openRecord")}
            </Link>
          </Button>
        </div>

        <dl className="grid gap-x-6 gap-y-2 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
          <div>
            <dt className="text-[13px] text-fg-subtle">{t("settings.profile.role")}</dt>
            <dd className="text-fg">{t(`role.${session.role}` as never)}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-fg-subtle">{t("settings.profile.church")}</dt>
            <dd className="text-fg">{session.tenantName}</dd>
          </div>
        </dl>
      </section>

      <h3 className="text-[15px] font-bold text-fg">{t("settings.profile.directory")}</h3>

      <DirectoryEntry
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

import { redirect } from "next/navigation";
import {
  withTenant, personForUser, householdFor, getPerson, directoryPreferencesFor,
  listContacts, listAddresses, canEditPeople, canReadIncidents,
  type PersonContact, type Visibility,
} from "@connectapp/db";
import { Card } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { Privacy } from "./privacy";
import { onDayLong } from "../when";

export const dynamic = "force-dynamic";

/** Two initials, for a face nobody has uploaded. */
const initials = (name: string): string =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((one) => one[0]!.toUpperCase()).join("");

/**
 * R17.2, R17.3. A member's own household, and what the church publishes of it.
 *
 * Reading rather than editing: changing a name or an address is a question for
 * the church office, and the one thing a member decides on their own is what
 * the directory shows. R17.2's full self-service edit is HRT-157's second half
 * and is not here yet.
 */
export default async function MyHouseholdPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);
  if (canEditPeople(session) || canReadIncidents(session)) {
    redirect(`/members?church=${session.tenantSlug}`);
  }

  const mine = await withTenant(
    {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      permissions: session.permissions,
    },
    async (tx) => {
      const self = await personForUser(tx, session.userId);
      if (!self) return null;
      const me = await getPerson(tx, self);
      const [home] = await listAddresses(tx, self);
      return {
        household: await householdFor(tx, self),
        privacy: await directoryPreferencesFor(tx, self),
        contacts: await listContacts(tx, self),
        birthday: me?.dateOfBirth ?? null,
        address: home
          ? [home.line1, home.city, home.region].filter(Boolean).join(", ")
          : "",
      };
    },
  );

  if (!mine) {
    return (
      <AppShell session={session} title={t("nav.myHousehold")} density="portal" max="max-w-3xl">
        <p className="text-[length:var(--d-text-body)] text-fg-muted">
          {t("member.error.noRecord")}
        </p>
      </AppShell>
    );
  }

  const lead = (kind: PersonContact["kind"]) =>
    mine.contacts.find((one) => one.kind === kind && one.isPrimary)?.value
    ?? mine.contacts.find((one) => one.kind === kind)?.value
    ?? "";

  const shown: Partial<Record<keyof Visibility, string>> = {
    showPhone: lead("phone"),
    showEmail: lead("email"),
    showAddress: mine.address,
    showBirthday: mine.birthday ? onDayLong(mine.birthday) : "",
  };

  return (
    <AppShell session={session} title={t("nav.myHousehold")} density="portal" max="max-w-3xl">
      <div className="flex flex-col gap-7">
        {mine.household ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-heading text-fg">{mine.household.name}</h2>
            <Card className="flex flex-col gap-3">
              {mine.household.members.map((one) => (
                <span key={one.id} className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-sunken text-caption font-semibold text-fg-muted"
                  >
                    {initials(one.displayName)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[length:var(--d-text-body)] font-medium text-fg">
                      {one.displayName}
                    </span>
                    <span className="truncate text-caption text-fg-muted">
                      {t(`householdRole.${one.role}` as never)}
                    </span>
                  </span>
                </span>
              ))}
            </Card>
          </section>
        ) : (
          <p className="text-[length:var(--d-text-body)] text-fg-muted">
            {t("home.noHousehold")}
          </p>
        )}

        <Privacy value={mine.privacy} shown={shown} church={session.tenantSlug} />
      </div>
    </AppShell>
  );
}

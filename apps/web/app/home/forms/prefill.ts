import "server-only";
import {
  withTenant, personForUser, getPerson, listContacts, listAddresses,
  type FormAnswer, type FormFieldDef,
} from "@connectapp/db";
import type { Session } from "@/lib/session";

/**
 * R17.9. What this church already knows about the person filling the form in.
 *
 * A member signed in should not type their own phone number into a church that
 * has it. Every question that maps to a part of their record starts on what the
 * record holds, and they can change any of it, because the point of asking is
 * that it might be wrong.
 *
 * Read from their own record through the tenant, so this says nothing a member
 * could not already read on their profile.
 */
export async function knownAnswers(
  session: Session,
  fields: FormFieldDef[],
): Promise<Record<string, FormAnswer>> {
  const wanted = fields.filter((one) => one.mapsTo);
  if (wanted.length === 0) return {};

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
      const [home] = await listAddresses(tx, self);
      return {
        person: await getPerson(tx, self),
        contacts: await listContacts(tx, self),
        home,
      };
    },
  );
  if (!mine?.person) return {};

  const lead = (kind: "email" | "phone") =>
    mine.contacts.find((one) => one.kind === kind && one.isPrimary)?.value
    ?? mine.contacts.find((one) => one.kind === kind)?.value
    ?? null;

  const known: Record<string, string | null> = {
    first_name: mine.person.firstName,
    last_name: mine.person.lastName,
    preferred_name: mine.person.preferredName,
    email: lead("email"),
    phone: lead("phone"),
    date_of_birth: mine.person.dateOfBirth,
    address_line1: mine.home?.line1 ?? null,
    address_line2: mine.home?.line2 ?? null,
    city: mine.home?.city ?? null,
    region: mine.home?.region ?? null,
    postal_code: mine.home?.postalCode ?? null,
    country: mine.home?.country ?? null,
  };

  const out: Record<string, FormAnswer> = {};
  for (const field of wanted) {
    const value = known[field.mapsTo!];
    if (value) out[field.id] = value;
  }
  return out;
}

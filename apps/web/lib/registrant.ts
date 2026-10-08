import "server-only";
import { withTenant, personForUser, getPerson, listContacts } from "@connectapp/db";
import { currentUser, belongsTo, requireSession } from "@/lib/session";

/** R14.3. What a signed-in member's first place is filled in with. */
export interface KnownRegistrant {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

/**
 * R14.3, R17.1. Who is reading this, where they are a member of this church.
 *
 * A member signed in to their own church was handed four empty boxes and
 * asked to type their own name, which the church already holds. The first
 * place is theirs, filled in, and every box stays editable: somebody booking
 * on behalf of a neighbour types over it.
 *
 * Nothing is assumed from a cookie. The church is read from the slug in the
 * address and the membership is checked against `tenant_members`, so a
 * stranger on the open web gets what they always got: empty boxes.
 */
export async function knownRegistrant(churchSlug: string): Promise<KnownRegistrant | null> {
  const user = await currentUser();
  if (!user) return null;
  if (!(await belongsTo(user.id, churchSlug))) return null;

  try {
    /* Membership is settled above, so this resolves rather than redirecting. */
    const session = await requireSession(churchSlug);

    return await withTenant({
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      permissions: session.permissions,
    }, async (tx) => {
      const self = await personForUser(tx, user.id);
      if (!self) return null;

      const person = await getPerson(tx, self);
      const contacts = await listContacts(tx, self);
      const first = (kind: "email" | "phone") =>
        contacts.find((one) => one.kind === kind && one.isPrimary)?.value
        ?? contacts.find((one) => one.kind === kind)?.value
        ?? "";

      return {
        firstName: person?.preferredName ?? person?.firstName ?? user.firstName ?? "",
        lastName: person?.lastName ?? user.lastName ?? "",
        email: first("email") || user.email,
        phone: first("phone"),
      };
    });
  } catch {
    // A member whose record cannot be read still gets the page, empty.
    return null;
  }
}

import { and, asc, eq, ne } from "drizzle-orm";
import type { Tx } from "../client";
import { messageTemplates } from "../schema/messaging";
import { PermissionError } from "../roles";
import { InvalidInputError } from "../errors";
import { canManageChurch } from "./church";
import { type TemplateInput, type MessageTemplate } from "./merge-rules";
import type { WriteActor } from "./people";

export * from "./merge-rules";

const NAME_LIMIT = 80;
const SUBJECT_LIMIT = 200;
const BODY_LIMIT = 20_000;

/**
 * R16.4. Writing a message, and keeping the ones worth sending again.
 *
 * Merge fields are plain names in double braces rather than a template
 * language. The person writing is a volunteer, and the failure mode of a
 * template language is a message that goes to four hundred people reading
 * "undefined".
 */

function check(input: TemplateInput): TemplateInput {
  const name = input.name?.trim();
  if (!name) throw new InvalidInputError("compose.error.name");

  const subject = input.subject?.trim();
  if (!subject) throw new InvalidInputError("compose.error.subject");

  const body = input.body?.trim();
  if (!body) throw new InvalidInputError("compose.error.body");
  if (body.length > BODY_LIMIT) throw new InvalidInputError("compose.error.long");

  return {
    name: name.slice(0, NAME_LIMIT),
    subject: subject.slice(0, SUBJECT_LIMIT),
    body,
  };
}

/** R16.4. The library, by name. */
export async function listMessageTemplates(db: Tx): Promise<MessageTemplate[]> {
  const rows = await db
    .select()
    .from(messageTemplates)
    .orderBy(asc(messageTemplates.name));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    subject: row.subject,
    body: row.body,
    updatedAt: row.updatedAt.toISOString(),
  }));
}

/** R16.4. Saves a message to the library, or replaces the one it is editing. */
export async function saveMessageTemplate(
  db: Tx,
  actor: WriteActor,
  input: TemplateInput,
  id?: string | null,
): Promise<{ id: string }> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "manageMessaging");
  const values = check(input);

  const [clash] = await db
    .select({ id: messageTemplates.id })
    .from(messageTemplates)
    .where(
      id
        ? and(eq(messageTemplates.name, values.name), ne(messageTemplates.id, id))
        : eq(messageTemplates.name, values.name),
    )
    .limit(1);
  if (clash) throw new InvalidInputError("compose.error.taken");

  if (id) {
    const changed = await db
      .update(messageTemplates)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(messageTemplates.id, id))
      .returning({ id: messageTemplates.id });
    if (changed.length === 0) throw new InvalidInputError("compose.error.missing");
    return { id };
  }

  const [made] = await db
    .insert(messageTemplates)
    .values({ tenantId: actor.tenantId, ...values })
    .returning({ id: messageTemplates.id });
  return { id: made!.id };
}

/**
 * R16.4. Takes a template out of the library.
 *
 * Deleted outright, because a template describes nothing that happened. The
 * messages already sent from it are unaffected.
 */
export async function removeMessageTemplate(
  db: Tx,
  actor: WriteActor,
  id: string,
): Promise<void> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "manageMessaging");

  const removed = await db
    .delete(messageTemplates)
    .where(eq(messageTemplates.id, id))
    .returning({ id: messageTemplates.id });
  if (removed.length === 0) throw new InvalidInputError("compose.error.missing");
}

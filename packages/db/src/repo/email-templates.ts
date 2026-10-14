import { and, asc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { emailTemplates } from "../schema/messaging";
import { PermissionError } from "../roles";
import { InvalidInputError } from "../errors";
import { canManageChurch } from "./church";
import type { WriteActor } from "./members";

/**
 * HRT-291, R16.4. Messages a church writes once and sends every year.
 *
 * Kept beside the service templates, because they are the same kind of thing:
 * something set up once that a week's work starts from. The composer takes a
 * copy rather than a link, so this year's wording can change without changing
 * what next year starts from.
 */

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  archivedAt: Date | null;
}

export async function listEmailTemplates(
  db: Tx,
  input: { archived?: boolean } = {},
): Promise<EmailTemplate[]> {
  return db
    .select({
      id: emailTemplates.id,
      name: emailTemplates.name,
      subject: emailTemplates.subject,
      body: emailTemplates.body,
      archivedAt: emailTemplates.archivedAt,
    })
    .from(emailTemplates)
    .where(
      input.archived
        ? isNotNull(emailTemplates.archivedAt)
        : isNull(emailTemplates.archivedAt),
    )
    .orderBy(asc(emailTemplates.name));
}

/** R16.4. How many are put away, for the one link that reaches them. */
export async function countArchivedEmailTemplates(db: Tx): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(emailTemplates)
    .where(isNotNull(emailTemplates.archivedAt));
  return row?.n ?? 0;
}

export async function saveEmailTemplate(
  db: Tx,
  actor: WriteActor,
  input: { id?: string | null; name: string; subject: string; body: string },
): Promise<string> {
  if (!canManageChurch(actor)) throw new PermissionError(actor.role, "editChurch");

  const name = input.name.trim();
  const subject = input.subject.trim();
  if (!name) throw new InvalidInputError("mailTemplate.error.name");
  if (!subject) throw new InvalidInputError("send.error.subject");
  if (!input.body.trim()) throw new InvalidInputError("send.error.body");

  if (input.id) {
    await db
      .update(emailTemplates)
      .set({ name, subject, body: input.body, updatedAt: new Date() })
      .where(eq(emailTemplates.id, input.id));
    return input.id;
  }

  const [row] = await db
    .insert(emailTemplates)
    .values({ tenantId: actor.tenantId, name, subject, body: input.body })
    .returning({ id: emailTemplates.id });

  return row!.id;
}

/** R21.x. Archive, and bring back. Nothing a church wrote is removed here. */
export async function archiveEmailTemplate(
  db: Tx,
  actor: WriteActor,
  id: string,
  away: boolean,
): Promise<void> {
  if (!canManageChurch(actor)) throw new PermissionError(actor.role, "editChurch");

  await db
    .update(emailTemplates)
    .set({ archivedAt: away ? new Date() : null, updatedAt: new Date() })
    .where(eq(emailTemplates.id, id));
}

/** R16.4. One template, for the composer starting from it. */
export async function readEmailTemplate(
  db: Tx,
  id: string,
): Promise<EmailTemplate | null> {
  const [row] = await db
    .select({
      id: emailTemplates.id,
      name: emailTemplates.name,
      subject: emailTemplates.subject,
      body: emailTemplates.body,
      archivedAt: emailTemplates.archivedAt,
    })
    .from(emailTemplates)
    .where(and(eq(emailTemplates.id, id), isNull(emailTemplates.archivedAt)))
    .limit(1);

  return row ?? null;
}

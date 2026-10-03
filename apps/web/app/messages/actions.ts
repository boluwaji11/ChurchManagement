"use server";

import {
  withTenant, listMessageTemplates, saveMessageTemplate, removeMessageTemplate,
  recipientsFor, queueSend, listSends, cancelSend,
  type TemplateInput, type AudienceChoice,
} from "@hearth/db";
import { runOneBatch, runDue } from "@/lib/run-sends";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

async function context(church?: string) {
  const session = await requireSession(church);
  return {
    actor: { tenantId: session.tenantId, role: session.role, userId: session.userId },
    ctx: { tenantId: session.tenantId, role: session.role, userId: session.userId },
  };
}

export interface ComposeResult {
  error?: string;
  id?: string;
}

/** R16.4. Keeps a message worth sending again. */
export async function keepTemplate(
  input: TemplateInput,
  id: string | null,
  church?: string,
): Promise<ComposeResult> {
  const { actor, ctx } = await context(church);
  try {
    const saved = await withTenant(ctx, (tx) => saveMessageTemplate(tx, actor, input, id));
    return { id: saved.id };
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function dropTemplate(id: string, church?: string): Promise<ComposeResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => removeMessageTemplate(tx, actor, id));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function templates(church?: string) {
  const { ctx } = await context(church);
  return withTenant(ctx, (tx) => listMessageTemplates(tx));
}

/**
 * R16.5. Who a message would go to, and how many of them can be reached.
 *
 * Asked for as the choice changes, because the number is the thing that tells
 * somebody they picked the wrong group before four hundred people find out.
 */
export async function audienceSize(
  choice: AudienceChoice,
  church?: string,
): Promise<{ total: number; reachable: number; noEmail: number; error?: string }> {
  const session = await requireSession(church);
  const ctx = { tenantId: session.tenantId, role: session.role, userId: session.userId };
  try {
    const result = await withTenant(ctx, (tx) =>
      recipientsFor(tx, choice, session.tenantName),
    );
    return {
      total: result.total,
      reachable: result.recipients.length,
      noEmail: result.noEmail,
    };
  } catch (error) {
    return { total: 0, reachable: 0, noEmail: 0, error: explain(error) };
  }
}

export interface QueueResult {
  error?: string;
  queued?: number;
  noEmail?: number;
}

/**
 * R16.6. Puts a message in the queue, and carries the first batch straight away.
 *
 * The first batch runs here so somebody who presses send watches something
 * happen. The rest is carried by whatever is calling the job route, which means
 * a send survives the laptop being closed.
 */
export async function queue(
  input: {
    subject: string;
    body: string;
    audience: AudienceChoice;
    audienceName: string;
    sendAt: string | null;
  },
  church?: string,
): Promise<QueueResult> {
  const session = await requireSession(church);
  const actor = { tenantId: session.tenantId, role: session.role, userId: session.userId };
  try {
    const result = await withTenant(actor, (tx) =>
      queueSend(tx, actor, input, session.tenantName),
    );

    if (!input.sendAt) await runOneBatch(actor, result.id);
    return { queued: result.recipients, noEmail: result.noEmail };
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R16.6. Carries the next batch of whatever is due, for the screen watching it. */
export async function nudge(church?: string): Promise<{ working: boolean }> {
  const session = await requireSession(church);
  const actor = { tenantId: session.tenantId, role: session.role, userId: session.userId };
  const results = await runDue(actor);
  return { working: results.some((r) => r.attempted > 0 && !r.done) };
}

export async function stopSend(id: string, church?: string): Promise<ComposeResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => cancelSend(tx, actor, id));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function sendList(church?: string) {
  const { ctx } = await context(church);
  return withTenant(ctx, (tx) => listSends(tx));
}

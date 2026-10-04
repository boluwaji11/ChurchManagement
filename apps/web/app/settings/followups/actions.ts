"use server";

import { withTenant, updatePipeline, setPipelineArchived } from "@hearth/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

export interface PipelineResult {
  error?: string;
}

const field = (data: FormData, name: string) => String(data.get(name) ?? "").trim();

async function context(church?: string) {
  const session = await requireSession(church);
  return { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions };
}

/** R5.2. A church putting its own process into its own words. */
export async function savePipeline(data: FormData): Promise<PipelineResult> {
  const ctx = await context(field(data, "church") || undefined);

  const names = data.getAll("stepName").map(String);
  const days = data.getAll("stepDays").map(String);
  const ids = data.getAll("stepId").map(String);

  const steps = names
    .map((name, i) => ({
      id: ids[i] || undefined,
      name: name.trim(),
      dueDays: Number(days[i] ?? ""),
    }))
    .filter((step) => step.name !== "");

  try {
    await withTenant(ctx, (tx) =>
      updatePipeline(tx, ctx, field(data, "id"), {
        name: field(data, "name"),
        description: field(data, "description") || null,
        ownerUserId: field(data, "ownerUserId") || null,
        steps,
      }),
    );
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R5.2. Off: nobody new enters it, and the people in it stay. */
export async function switchPipeline(
  id: string,
  off: boolean,
  church?: string,
): Promise<PipelineResult> {
  const ctx = await context(church);
  try {
    await withTenant(ctx, (tx) => setPipelineArchived(tx, ctx, id, off));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

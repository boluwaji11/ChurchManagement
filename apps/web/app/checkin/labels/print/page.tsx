import { withTenant, labelsFor, getLabelLayout } from "@hearth/db";
import { requireSession } from "@/lib/session";
import { LabelSheet } from "../sheet";
import { LocalLabels } from "../local";

export const dynamic = "force-dynamic";

/**
 * R8.6, R8.11. The label pair, on its own page so it can be printed.
 *
 * A page of its own rather than a panel inside the desk, because printing a
 * region of a screen means fighting the browser over what to leave out, and
 * what gets left out by accident here is a child's room or their code.
 */
export default async function LabelsPage({
  searchParams,
}: {
  searchParams: Promise<{
    church?: string; service?: string; people?: string;
    local?: string; printer?: string;
  }>;
}) {
  const { church, service, people, local, printer } = await searchParams;

  // R8.24. A station with no network prints what it wrote down itself.
  if (local) return <LocalLabels printer={printer} />;

  const session = await requireSession(church);

  const personIds = (people ?? "").split(",").filter(Boolean);
  const { labels, layout } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => ({
      labels: service ? await labelsFor(tx, service, personIds, session.tenantName) : [],
      layout: await getLabelLayout(tx, session.tenantId),
    }),
  );

  return <LabelSheet labels={labels} printer={printer} layout={layout} />;
}

import { withTenant, labelsFor } from "@hearth/db";
import { requireSession } from "@/lib/session";
import { LabelSheet } from "./sheet";

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
  searchParams: Promise<{ church?: string; service?: string; people?: string }>;
}) {
  const { church, service, people } = await searchParams;
  const session = await requireSession(church);

  const personIds = (people ?? "").split(",").filter(Boolean);
  const labels = service
    ? await withTenant({ tenantId: session.tenantId, role: session.role }, (tx) =>
        labelsFor(tx, service, personIds, session.tenantName),
      )
    : [];

  return <LabelSheet labels={labels} />;
}

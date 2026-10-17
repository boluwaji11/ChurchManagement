import { Badge } from "@connectapp/ui";

/**
 * R21.x, R1.1. Where a church stands, written once.
 *
 * In its own file rather than beside the list it was first drawn in, because
 * a Next page may only export a page and exporting this from one broke the
 * build. Three screens read it.
 */
export function Standing({
  church,
}: {
  church: { approvedAt: Date | null; archivedAt: Date | null };
}) {
  if (church.archivedAt) return <Badge tone="neutral">Archived</Badge>;
  if (church.approvedAt) return <Badge tone="success">Approved</Badge>;
  return <Badge tone="warning">Waiting</Badge>;
}

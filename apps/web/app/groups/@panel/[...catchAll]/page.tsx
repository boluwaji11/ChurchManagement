import { panelFor } from "../dispatch";

/**
 * R9.5, R24.6. The window, on a load of its own address.
 *
 * An address typed in, reloaded or followed from outside is not an
 * interception, so the slot falls here and draws the same window over the same
 * list.
 */
export default async function GroupPanelRoute({
  params,
  searchParams,
}: {
  params: Promise<{ catchAll: string[] }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { catchAll } = await params;
  /* The slot is handed the whole path rather than what is under /groups. */
  const segments = catchAll[0] === "groups" ? catchAll.slice(1) : catchAll;

  return panelFor(
    segments,
    Promise.resolve({ id: segments[0] ?? "" }),
    searchParams,
  );
}

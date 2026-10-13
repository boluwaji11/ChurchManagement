import { panelFor } from "../dispatch";

/**
 * R14.1, R24.6. The window, on a load of its own address.
 */
export default async function EventPanelRoute({
  params,
  searchParams,
}: {
  params: Promise<{ catchAll: string[] }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { catchAll } = await params;
  /* The slot is handed the whole path rather than what is under /events. */
  const segments = catchAll[0] === "events" ? catchAll.slice(1) : catchAll;

  return panelFor(
    segments,
    Promise.resolve({ id: segments[0] ?? "" }),
    searchParams,
  );
}

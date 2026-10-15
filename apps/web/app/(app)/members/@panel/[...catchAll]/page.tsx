import { panelFor } from "../dispatch";

/**
 * R2.1, R24.6. The window, on a load of its own address.
 *
 * An address typed in, reloaded or followed from outside is not an
 * interception, so the slot falls here. It draws the same window over the same
 * list, which is why none of these screens needs a page of its own any more.
 */
export default async function MemberPanelRoute({
  params,
  searchParams,
}: {
  params: Promise<{ catchAll: string[] }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { catchAll } = await params;
  /* The slot is handed the whole path rather than what is under /members, so
     a record was looked up under the name of the section it is in. */
  const segments = catchAll[0] === "members" ? catchAll.slice(1) : catchAll;

  return panelFor(
    segments,
    Promise.resolve({ id: segments[0] ?? "" }),
    searchParams,
  );
}

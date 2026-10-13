import { panelFor } from "../dispatch";

/** R4.1, R24.6. The window, on a load of its own address. */
export default async function FormPanelRoute({
  params,
  searchParams,
}: {
  params: Promise<{ catchAll: string[] }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { catchAll } = await params;
  /* The slot is handed the whole path rather than what is under /forms. */
  const segments = catchAll[0] === "forms" ? catchAll.slice(1) : catchAll;

  return panelFor(
    segments,
    Promise.resolve({ id: segments[0] ?? "" }),
    searchParams,
  );
}

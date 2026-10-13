import { FormPanelPage } from "../[id]/page-content";

/** R4.1, R24.6. Which window stands over the forms list for a given address. */
export function panelFor(
  segments: string[],
  params: Promise<{ id: string }>,
  searchParams: Promise<Record<string, string>>,
) {
  const [name] = segments;
  if (!name) return null;
  return <FormPanelPage params={params} searchParams={searchParams} />;
}

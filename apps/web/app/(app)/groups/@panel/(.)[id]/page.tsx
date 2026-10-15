import { panelFor } from "../dispatch";

/** R9.5, R24.6. The window, on a press from the list. */
export default async function InterceptedGroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { id } = await params;
  return panelFor([id], params, searchParams);
}

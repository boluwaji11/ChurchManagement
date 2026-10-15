import { returnToList, filtersIn } from "@/lib/return-to";
import { FormsListScreen } from "./list-screen";

/** R4.1, R24.6. The forms list, standing under a window. */
export function FormsUnder({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <FormsListScreen searchParams={filtersFrom(searchParams)} />;
}

async function filtersFrom(
  searchParams: Promise<Record<string, string | string[] | undefined>>,
): Promise<{ archived?: string }> {
  const params = await searchParams;
  return filtersIn(returnToList(params.returnTo, "/forms"));
}

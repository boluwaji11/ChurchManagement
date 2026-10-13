import { returnToList, filtersIn } from "@/lib/return-to";
import { GroupsListScreen } from "./list-screen";

/**
 * R9.5, R24.6. The groups list, standing under a window.
 *
 * Every address under /groups draws it, so a group opened by its own address
 * gives the same screen as pressing for it from the list.
 */
export function GroupsUnder({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <GroupsListScreen searchParams={filtersFrom(searchParams)} />;
}

async function filtersFrom(
  searchParams: Promise<Record<string, string | string[] | undefined>>,
): Promise<{ type?: string; archived?: string }> {
  const params = await searchParams;
  return filtersIn(returnToList(params.returnTo, "/groups"));
}

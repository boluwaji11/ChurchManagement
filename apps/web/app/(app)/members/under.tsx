import { memberDirectoryReturnTo } from "@/lib/member-return";
import type { DirectoryParams } from "@/lib/directory-query";
import { MembersListScreen } from "./list-screen";

/**
 * R2.1, R24.6. The directory, standing under a window.
 *
 * Every address under /members draws this, so arriving at one by its own
 * address gives the same screen as pressing for it from the list: the
 * directory, dimmed, with the window over it.
 *
 * The filters come from the way back the window carries, which is where they
 * live once a record is open.
 */
export function MembersUnder({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <MembersListScreen searchParams={filtersFrom(searchParams)} />;
}

async function filtersFrom(
  searchParams: Promise<Record<string, string | string[] | undefined>>,
): Promise<DirectoryParams> {
  const params = await searchParams;
  const back = memberDirectoryReturnTo(params.returnTo);
  const query = back.split("?")[1];
  return query
    ? (Object.fromEntries(new URLSearchParams(query)) as DirectoryParams)
    : {};
}

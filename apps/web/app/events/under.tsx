import { returnToList, filtersIn } from "@/lib/return-to";
import { EventsListScreen } from "./list-screen";

/**
 * R14.1, R24.6. The events list, standing under a window.
 */
export function EventsUnder({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <EventsListScreen searchParams={filtersFrom(searchParams)} />;
}

async function filtersFrom(
  searchParams: Promise<Record<string, string | string[] | undefined>>,
): Promise<{ archived?: string }> {
  const params = await searchParams;
  return filtersIn(returnToList(params.returnTo, "/events"));
}

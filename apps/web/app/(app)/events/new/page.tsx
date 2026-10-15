import { generateMetadata } from "./page-content";
import { EventsUnder } from "@/app/(app)/events/under";

export const dynamic = "force-dynamic";
export { generateMetadata };

/* R14.1, R24.6. The list, with this screen's window standing over it. */
export default function EventScreenRoutePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <EventsUnder searchParams={searchParams} />;
}

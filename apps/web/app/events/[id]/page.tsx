import { generateMetadata } from "./page-content";
import { EventsUnder } from "../under";

export const dynamic = "force-dynamic";
export { generateMetadata };

/* R14.1, R24.6. The list, with this event's window standing over it. */
export default function EventRoutePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <EventsUnder searchParams={searchParams} />;
}

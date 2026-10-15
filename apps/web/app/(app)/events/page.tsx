import { t } from "@connectapp/i18n";
import { tabMetadata } from "@/lib/page-metadata";
import { EventsListScreen } from "./list-screen";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata() {
  return tabMetadata(t("event.title"));
}

export default function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  return <EventsListScreen searchParams={searchParams} />;
}

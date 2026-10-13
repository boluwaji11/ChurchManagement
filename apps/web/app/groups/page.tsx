import { t } from "@connectapp/i18n";
import { tabMetadata } from "@/lib/page-metadata";
import { GroupsListScreen } from "./list-screen";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata() {
  return tabMetadata(t("nav.groups"));
}

export default function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; archived?: string }>;
}) {
  return <GroupsListScreen searchParams={searchParams} />;
}

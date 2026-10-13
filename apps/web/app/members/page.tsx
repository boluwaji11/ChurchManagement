import { t } from "@connectapp/i18n";
import { tabMetadata } from "@/lib/page-metadata";
import type { DirectoryParams } from "@/lib/directory-query";
import { MembersListScreen } from "./list-screen";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata() {
  return tabMetadata(t("members.title"));
}

export default function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<DirectoryParams>;
}) {
  return <MembersListScreen searchParams={searchParams} />;
}

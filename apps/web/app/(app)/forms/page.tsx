import { t } from "@connectapp/i18n";
import { tabMetadata } from "@/lib/page-metadata";
import { FormsListScreen } from "./list-screen";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata() {
  return tabMetadata(t("form.title"));
}

export default function FormsPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  return <FormsListScreen searchParams={searchParams} />;
}

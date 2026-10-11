import { notFound } from "next/navigation";
import { t } from "@connectapp/i18n";
import { churchFromHost } from "@/lib/session";
import { publicTab } from "@/lib/page-metadata";
import EmbeddedGroupsPage from "../[slug]/embed/page";

export const dynamic = "force-dynamic";

/** R17.1. The church this page belongs to, in the browser tab. */
export async function generateMetadata() {
  const church = await churchFromHost();
  return publicTab(t("nav.groups"), church ?? undefined);
}

/**
 * R9.5, R17.1. The group finder for a church's own page, on its own address.
 *
 * A static segment beside `/g/[slug]`, so it wins: on a church's address
 * `/g/embed` is this rather than a group called "embed". That is the same
 * trade `/e/[slug]/register` already carries, and a church naming a group
 * "embed" is a price worth the short address on every snippet.
 */
export default async function GroupsEmbedHere() {
  const church = await churchFromHost();
  if (!church) notFound();
  return EmbeddedGroupsPage({ params: Promise.resolve({ slug: church }) });
}

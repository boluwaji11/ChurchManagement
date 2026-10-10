import { redirect } from "next/navigation";
import { t } from "@connectapp/i18n";
import { publicTab } from "@/lib/page-metadata";
import { publicPath } from "@/lib/church-address";
import { GroupScreen } from "../../group-screen";

export const dynamic = "force-dynamic";

/** R17.1. The church this page belongs to, in the browser tab. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return publicTab(t("nav.groups"), slug);
}

/**
 * R9.5, R17.1. One group, with the church named in the path.
 *
 * The address a church handed out before it had one of its own, so it goes on
 * working and sends people to the short path where there is one.
 */
export default async function PublicGroupPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;

  const elsewhere = await publicPath(slug, `/g/${id}`);
  if (elsewhere) redirect(elsewhere);

  return <GroupScreen slug={slug} id={id} />;
}

import { redirect } from "next/navigation";
import { t } from "@connectapp/i18n";
import { publicTab } from "@/lib/page-metadata";
import { publicPath } from "@/lib/church-address";
import { GiveScreen } from "../screen";

export const dynamic = "force-dynamic";

/** R17.1. The church this page belongs to, in the browser tab. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return publicTab(t("nav.giving"), slug);
}

/**
 * R13.6, R17.1. Giving, with the church named in the path.
 *
 * The address a church has handed out on a card, in a news sheet and on its
 * own website, so it goes on working. A church with an address of its own is
 * sent to it, where the host says the name and the path does not repeat it.
 */
export default async function GivePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const elsewhere = await publicPath(slug, "/give");
  if (elsewhere) redirect(elsewhere);

  return <GiveScreen slug={slug} />;
}

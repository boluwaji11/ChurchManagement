import { redirect } from "next/navigation";
import { t } from "@connectapp/i18n";
import { publicTab } from "@/lib/page-metadata";
import { publicPath } from "@/lib/church-address";
import { JoinScreen } from "../screen";

export const dynamic = "force-dynamic";

/** R17.1. The church this page belongs to, in the browser tab. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ church: string }>;
}) {
  const { church } = await params;
  return publicTab(t("signUp.title"), church);
}

/**
 * R1.7, R22.1. The church's own door, with the church named in the path.
 *
 * The way in from our own host, where the path is the only thing saying which
 * church, and the address a church handed out before it had one of its own. A
 * church with an address is sent to it, where the host says the name and
 * `/join` answers without repeating it.
 */
export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ church: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { church } = await params;

  const elsewhere = await publicPath(church, "/join");
  if (elsewhere) redirect(elsewhere);

  return <JoinScreen slug={church} searchParams={searchParams} />;
}

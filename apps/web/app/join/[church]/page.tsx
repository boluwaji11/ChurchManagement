import { t } from "@connectapp/i18n";
import { publicTab } from "@/lib/page-metadata";
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
 * R1.7, R22.1. The church's own door, named in the address.
 *
 * The way in from our own host, where the path is the only thing saying which
 * church. On the church's own address the host says it and `/join` answers
 * instead.
 */
export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ church: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { church } = await params;
  return <JoinScreen slug={church} searchParams={searchParams} />;
}

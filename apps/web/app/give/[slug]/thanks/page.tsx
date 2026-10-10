import { redirect } from "next/navigation";
import { t } from "@connectapp/i18n";
import { publicTab } from "@/lib/page-metadata";
import { publicPath } from "@/lib/church-address";
import { ThanksScreen } from "../../thanks-screen";

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
 * R13.6, R17.1. Where Stripe sends a giver back, with the church in the path.
 *
 * A gift begun before the church had an address of its own comes back here,
 * and Stripe holds the address it was given at the time. So it goes on
 * working, and sends them to the short path where there is one. The session
 * Stripe appends travels with them, because the thanks is written from it.
 */
export default async function ThanksPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session?: string }>;
}) {
  const { slug } = await params;

  const elsewhere = await publicPath(slug, "/give/thanks");
  if (elsewhere) redirect(elsewhere);

  return <ThanksScreen slug={slug} searchParams={searchParams} />;
}

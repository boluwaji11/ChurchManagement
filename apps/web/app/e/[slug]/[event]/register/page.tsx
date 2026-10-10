import { redirect } from "next/navigation";
import { t } from "@connectapp/i18n";
import { publicTab } from "@/lib/page-metadata";
import { publicPath } from "@/lib/church-address";
import { RegisterScreen } from "../../../register-screen";

export const dynamic = "force-dynamic";

/** R17.1. The church this page belongs to, in the browser tab. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return publicTab(t("nav.events"), slug);
}

/**
 * R14.2, R14.6. Taking a place, with the church named in the path.
 *
 * The address somebody bookmarked halfway through signing up, so it goes on
 * working and sends them to the short path where the church has one.
 */
export default async function RegisterPage({
  params,
}: {
  params: Promise<{ slug: string; event: string }>;
}) {
  const { slug, event } = await params;

  const elsewhere = await publicPath(slug, `/e/${event}/register`);
  if (elsewhere) redirect(elsewhere);

  return <RegisterScreen slug={slug} event={event} />;
}

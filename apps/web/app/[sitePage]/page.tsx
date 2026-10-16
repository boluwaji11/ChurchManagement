import { notFound } from "next/navigation";
import { churchFromHost } from "@/lib/session";
import { churchSiteMetadata, churchSitePage } from "@/lib/church-site-page";

/**
 * HRT-381, R17.1, R22.2. Any page of a church's website other than its home.
 *
 * A single segment at the root, which Next reaches only when no address of the
 * product's own matches, because a static segment always wins over a dynamic
 * one. So `/sign-in` is still the door, `/give/riverside` is still the giving
 * page, and `/about` belongs to whichever church's host was opened.
 *
 * On our own host there is no church, so this is a miss and the product's own
 * not-found answers, exactly as before.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata(
  { params }: { params: Promise<{ sitePage: string }> },
) {
  const church = await churchFromHost();
  if (!church) return {};
  const { sitePage } = await params;
  return (await churchSiteMetadata(church, sitePage)) ?? {};
}

export default async function ChurchSitePage(
  { params }: { params: Promise<{ sitePage: string }> },
) {
  const church = await churchFromHost();
  if (!church) notFound();
  const { sitePage } = await params;
  const hit = await churchSitePage(church, sitePage);
  if (!hit) notFound();
  return hit.body;
}

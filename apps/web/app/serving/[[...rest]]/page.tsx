import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * R24.6. The address this screen used to live at.
 *
 * Serving became the schedule. A leader with the old address in a bookmark, or
 * a volunteer with an invitation link to answer, lands where the screen moved
 * to rather than on a 404.
 */
export default async function MovedPage({
  params,
  searchParams,
}: {
  params: Promise<{ rest?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { rest } = await params;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") query.set(key, value);
  }

  const path = ["schedule", ...(rest ?? [])].join("/");
  const search = query.toString();
  redirect(`/${path}${search ? `?${search}` : ""}`);
}

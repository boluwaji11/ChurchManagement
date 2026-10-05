import type { NextRequest } from "next/server";
import { resolveTenantBySlug } from "@connectapp/db";

export const dynamic = "force-dynamic";

/**
 * R17.11. What a phone reads when somebody installs the portal.
 *
 * One manifest a church rather than one for the product. A member is adding
 * their church to their home screen, so the name on the icon is the church's
 * name and the app opens on their own screen inside it.
 *
 * The icon stays ours. A church logo is a private file behind a signed URL
 * that expires in an hour, and a home screen icon that stops loading next week
 * is worse than one that was never the church's to begin with.
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("church");
  const church = slug ? await resolveTenantBySlug(slug) : null;

  const start = church && slug ? `/home?church=${slug}` : "/home";

  return Response.json(
    {
      name: church?.name ?? "ConnectApp",
      short_name: church?.name ?? "ConnectApp",
      description: church ? `${church.name} on ConnectApp` : "ConnectApp",
      start_url: start,
      scope: "/",
      display: "standalone",
      orientation: "portrait",
      background_color: "#faf8f5",
      theme_color: "#faf8f5",
      icons: [
        { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      ],
    },
    {
      headers: {
        "content-type": "application/manifest+json",
        "cache-control": "no-store",
      },
    },
  );
}

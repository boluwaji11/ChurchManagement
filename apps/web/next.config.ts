import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { NextConfig } from "next";

/**
 * Secrets live in one file at the repo root, not duplicated per app. Next only
 * reads env files from its own directory, so load the root one here. This runs
 * before compilation, which is early enough for NEXT_PUBLIC_ values to be inlined.
 */
const rootEnv = resolve(import.meta.dirname, "../../.env.local");
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const config: NextConfig = {
  /**
   * A verification build must never write into the directory a running dev
   * server is serving from. Deleting or rebuilding .next underneath `next dev`
   * leaves its manifest pointing at chunks that no longer exist, and the page
   * loads with no CSS and no JS. Scripted builds set NEXT_DIST_DIR and stay out
   * of the way.
   */
  distDir: process.env["NEXT_DIST_DIR"] || ".next",
  transpilePackages: ["@connectapp/ui", "@connectapp/db", "@connectapp/i18n"],
  // postgres.js is a server driver. Keep it out of the bundle entirely.
  serverExternalPackages: ["postgres"],
  /**
   * The directory was at /people until the church's own word for it won.
   * Anything already written down, a bookmark, a printed sheet, a link in an
   * email, still arrives.
   */
  async redirects() {
    return [
      { source: "/people", destination: "/members", permanent: true },
      { source: "/people/:path*", destination: "/members/:path*", permanent: true },
    ];
  },
  experimental: {
    /*
     * R24.11. A screen somebody just looked at is still in hand when they come
     * back to it.
     *
     * Next 15 changed the dynamic client cache from 30 seconds to 0, so every
     * page segment is thrown away the moment it is navigated away from. Every
     * screen in this product is per-church and therefore dynamic, so moving
     * between two tabs and back paid a full server render each way: measured
     * here, clicking to the directory cost 943ms the first time and 895ms the
     * second, which is the shape of a cache that is not there.
     *
     * Thirty seconds is what Next 14 did and what the docs name as the way
     * back to it. It holds the rendered segment in the browser, not the data in
     * a shared cache, so one reader's screens never reach another's.
     *
     * What it does mean: a change somebody else makes can be up to thirty
     * seconds behind on a screen this reader has already opened. A write of
     * their own does not have that problem, because the action's revalidate
     * clears it. A role or permission change is the case to watch, and the
     * answer there is that the server decides every read regardless: a stale
     * screen cannot show a row the next request would refuse.
     */
    staleTimes: { dynamic: 30, static: 180 },
    /*
     * R24.12. A link in the navigation is fetched on the intent to press it.
     *
     * Every screen here is per-church and therefore dynamic, and Next's own
     * default fetches a dynamic route only as far as the nearest loading
     * boundary, which is nothing the reader waits for. This turns a hover, a
     * focus or a finger landing into a fetch of the whole screen, which buys
     * the 150ms to 300ms before the press. Fetching every link on sight is the
     * other extreme and would have the server rendering fourteen screens for
     * the one somebody opened.
     *
     * It does nothing in development, where Next skips prefetching on hover,
     * so this is measured against a build.
     */
    dynamicOnHover: true,
    // Shared element transitions where a card becomes a detail page. (R24.12)
    viewTransition: true,
    /*
     * 197 files import the component library through its one barrel, and
     * without this every one of them pulls the whole package in. Next already
     * does the same for lucide-react.
     */
    optimizePackageImports: ["@connectapp/ui"],
  },
};

export default config;

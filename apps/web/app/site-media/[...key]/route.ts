import { NextResponse } from "next/server";
import { canManageSite, membershipsForUser, siteMediaIsPublic } from "@connectapp/db";
import { currentUser } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * HRT-383, R22.2, R24.11. One address for a picture on a church's website.
 *
 * The pictures live in the church's own private folder, so they were served
 * through a signed address created on every render, which expires in an hour.
 * That had two costs. The page could never be held, because an hour-old copy
 * of the HTML would carry dead picture addresses. And the same photograph had a
 * different address every time, so no browser and no edge ever cached one.
 *
 * This is the stable address instead: `/site-media/<key>`, which answers with a
 * redirect to a fresh signed address and says how long the answer is good for.
 * The HTML becomes cacheable, the photograph gets cached by the browser, and
 * the church's storage stays private.
 *
 * Who may fetch what:
 *
 *   anybody   a picture the church's LIVE document points at, and only that.
 *             Enforced twice: here, and by the storage policy the signing goes
 *             through, which asks the same question in SQL.
 *   the staff anything in their own church's website folder, so the editor can
 *             show a photograph that has been uploaded and not yet published.
 *
 * A key is the church's slug, then the purpose, then a random name, so the
 * church is read off the key and checked rather than taken on trust.
 */

const KEY = /^[a-z0-9][a-z0-9-]{0,62}\/(website_media|logo)\/[a-f0-9-]{36}\.(?:png|jpg|webp|mp4|webm)$/;

/** An hour less a little, so a held redirect never outlives what it points at. */
const SIGNED_FOR = 3600;
const HELD_FOR = 3000;

const gone = () => new NextResponse(null, { status: 404 });

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key: parts } = await params;
  const key = parts.join("/");
  if (!KEY.test(key)) return gone();
  const slug = key.split("/")[0]!;

  /*
   * A church's mark is public by nature: it is on its website, its giving page
   * and its notice sheet, and the storage policy says so by name. Everything
   * else has to be on the published website.
   */
  const isLogo = key.split("/")[1] === "logo";
  const open = isLogo || await siteMediaIsPublic(slug, key);
  if (!open) {
    /* Not on the published page. Only this church's own staff may see it. */
    const user = await currentUser();
    if (!user) return gone();
    const membership = (await membershipsForUser(user.id))
      .find((one) => one.tenantSlug === slug);
    if (!membership || !canManageSite(membership)) return gone();
  }

  const supabase = await supabaseServer();
  const signed = await supabase.storage.from("church").createSignedUrl(key, SIGNED_FOR);
  if (signed.error || !signed.data?.signedUrl) return gone();

  return NextResponse.redirect(signed.data.signedUrl, {
    status: 307,
    headers: open
      ? {
          /* A published photograph is the same photograph for everybody, so it
             is held at the edge as well as in the browser. */
          "Cache-Control": `public, max-age=${HELD_FOR}, s-maxage=${HELD_FOR}, stale-while-revalidate=600`,
        }
      : { "Cache-Control": "private, no-store" },
  });
}

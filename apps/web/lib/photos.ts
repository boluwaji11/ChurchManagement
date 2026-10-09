import { cache } from "react";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * R2.9. Faces for a list, signed in one round trip.
 *
 * The photo bucket is private, so every face on a screen is a signed URL with
 * an hour on it. A directory of two hundred would be two hundred calls one at a
 * time, so the keys go up together and come back as a map the rows read from.
 * Cached for the request, because a page and its panel often ask for the same
 * people.
 */
export const photoUrls = cache(
  async (keys: readonly (string | null | undefined)[]): Promise<Record<string, string>> => {
    const wanted = [...new Set(keys.filter((one): one is string => Boolean(one)))];
    if (wanted.length === 0) return {};

    const supabase = await supabaseServer();
    const signed = await supabase.storage.from("church").createSignedUrls(wanted, 3600);

    const out: Record<string, string> = {};
    for (const row of signed.data ?? []) {
      if (row.path && row.signedUrl) out[row.path] = row.signedUrl;
    }
    return out;
  },
);

/**
 * R16.9. The same faces, without asking storage again every few seconds.
 *
 * A signed link lasts an hour and the inbox asks for its faces on a timer, so
 * each one is held for half that and handed back. Keys are written fresh on
 * every upload, so a held link cannot point at a photo somebody replaced.
 */
const HELD = new Map<string, { url: string; until: number }>();
const HOLD_FOR = 30 * 60 * 1000;

export async function heldPhotoUrls(
  keys: readonly (string | null | undefined)[],
): Promise<Record<string, string>> {
  const now = Date.now();
  const wanted = [...new Set(keys.filter((one): one is string => Boolean(one)))];

  const out: Record<string, string> = {};
  const missing: string[] = [];
  for (const key of wanted) {
    const held = HELD.get(key);
    if (held && held.until > now) out[key] = held.url;
    else missing.push(key);
  }

  if (missing.length > 0) {
    const fresh = await photoUrls(missing);
    for (const [key, url] of Object.entries(fresh)) {
      HELD.set(key, { url, until: now + HOLD_FOR });
      out[key] = url;
    }
  }

  return out;
}

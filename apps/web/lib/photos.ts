import { supabaseServer } from "@/lib/supabase/server";

/**
 * R2.9, R24.11. Faces for a screen, signed once and held.
 *
 * The photo bucket is private, so every face and every church's mark is a
 * signed URL. A directory of two hundred would be two hundred calls one at a
 * time, so the keys go up together and come back as a map the rows read from.
 *
 * Held for half an hour, per key. This used to be wrapped in React's `cache`,
 * which keys on the argument's identity, and every caller passes a fresh array
 * literal: the cache could never hit, not once, so the frame around every
 * screen signed the church's mark and the reader's face again on every single
 * navigation, and so did every list beneath it. Holding the keys themselves is
 * what the request-scoped version was trying to be.
 *
 * A signed link lasts an hour, so half of one is always a link with time left
 * on it. A key is written fresh on every upload, so a held link cannot point at
 * a photo somebody has replaced: the new photo has a new key and misses.
 *
 * The hold is per server instance, which on a serverless platform means a warm
 * instance answers from memory and a cold one signs once.
 */
const HELD = new Map<string, { url: string; until: number }>();
const HOLD_FOR = 30 * 60 * 1000;

/** An hour, which is what a signed link is good for. */
const SIGNED_FOR = 3600;

export async function photoUrls(
  keys: readonly (string | null | undefined)[],
): Promise<Record<string, string>> {
  const now = Date.now();
  const wanted = [...new Set(keys.filter((one): one is string => Boolean(one)))];
  if (wanted.length === 0) return {};

  const out: Record<string, string> = {};
  const missing: string[] = [];
  for (const key of wanted) {
    const held = HELD.get(key);
    if (held && held.until > now) out[key] = held.url;
    else missing.push(key);
  }

  if (missing.length === 0) return out;

  const supabase = await supabaseServer();
  const signed = await supabase.storage.from("church").createSignedUrls(missing, SIGNED_FOR);

  for (const row of signed.data ?? []) {
    if (!row.path || !row.signedUrl) continue;
    HELD.set(row.path, { url: row.signedUrl, until: now + HOLD_FOR });
    out[row.path] = row.signedUrl;
  }

  /* A key storage has no object for comes back without a URL. Nothing is held
     for it, so a photo uploaded a moment later is signed on the next read
     rather than being remembered as missing. */
  return out;
}

/**
 * R16.9. The former name for the above, kept while the inbox still asks by it.
 *
 * The holding it was written for is what `photoUrls` does now, for every
 * screen rather than only this one.
 */
export const heldPhotoUrls = photoUrls;

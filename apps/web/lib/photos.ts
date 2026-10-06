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

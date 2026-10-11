import "server-only";
import type { WebsiteSection } from "@connectapp/db";
import { supabaseServer } from "@/lib/supabase/server";

export async function signWebsiteMedia<T extends { sections: WebsiteSection[] }>(
  website: T,
): Promise<T> {
  const keys = [...new Set(website.sections.flatMap((section) =>
    [section.imageKey, section.videoKey].filter((key): key is string => Boolean(key)),
  ))];
  if (keys.length === 0) return website;

  const supabase = await supabaseServer();
  const result = await supabase.storage.from("church").createSignedUrls(keys, 3600);
  if (result.error) throw new Error("Could not prepare public website media.");

  const signed = new Map(
    (result.data ?? [])
      .filter((item): item is typeof item & { path: string; signedUrl: string } =>
        Boolean(item.path && item.signedUrl),
      )
      .map((item) => [item.path, item.signedUrl]),
  );
  return {
    ...website,
    sections: website.sections.map((section) => ({
      ...section,
      imageUrl: section.imageKey ? signed.get(section.imageKey) ?? null : section.imageUrl,
      videoUrl: section.videoKey ? signed.get(section.videoKey) ?? null : section.videoUrl,
    })),
  };
}

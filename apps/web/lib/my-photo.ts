import { cache } from "react";
import { withTenant, personForUser, getPerson } from "@connectapp/db";
import { supabaseServer } from "@/lib/supabase/server";
import type { Session } from "@/lib/session";

/**
 * R2.9. The face of whoever is signed in, for the chrome that shows it.
 *
 * The photo bucket is private, so a face is served through a signed URL with an
 * hour on it. Every shell is force-dynamic, so a reader who leaves a tab open
 * overnight gets a fresh one on their next navigation. Cached for the request,
 * because the sidebar and the top bar both ask.
 */
export const myPhotoUrl = cache(async (session: Session): Promise<string | null> => {
  const key = await withTenant(
    {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      permissions: session.permissions,
    },
    async (tx) => {
      const self = await personForUser(tx, session.userId);
      if (!self) return null;
      const person = await getPerson(tx, self, { role: session.role, userId: session.userId });
      return person?.photoKey ?? null;
    },
  );

  if (!key) return null;
  const supabase = await supabaseServer();
  const signed = await supabase.storage.from("church").createSignedUrl(key, 3600);
  return signed.data?.signedUrl ?? null;
});

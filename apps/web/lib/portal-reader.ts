import "server-only";
import type { Session } from "@/lib/session";
import { currentUser, belongsTo, requireSession } from "@/lib/session";
import { readsAsMember } from "@/lib/reads-as-member";

/**
 * R17.1. Whether a public page is being read by a member of the church it
 * belongs to, who should therefore read it in the portal's frame.
 *
 * A stranger, somebody signed in to another church, and anybody with a job in
 * the product all get null, which is the public page they asked for. Staff
 * keep the public view on purpose: they open these to check what the
 * congregation sees.
 *
 * Nothing is taken from a cookie. The church comes from the slug in the
 * address and the membership is checked against `tenant_members`.
 */
export async function portalReader(churchSlug: string): Promise<Session | null> {
  const user = await currentUser();
  if (!user) return null;
  if (!(await belongsTo(user.id, churchSlug))) return null;

  try {
    const session = await requireSession(churchSlug);
    return readsAsMember(session) ? session : null;
  } catch {
    // A session that cannot be resolved still gets the page, as the public one.
    return null;
  }
}

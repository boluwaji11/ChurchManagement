import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import {
  withTenant, joinCodeForPublicGroup, joinWithCode, requestToJoin, resolveTenantBySlug,
  membershipsForUser,
} from "@connectapp/db";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * R9.5, R9.6. Following a published group all the way in.
 *
 * A stranger reading a group on the church's website presses Join and should
 * end up in the group, not at a sign-in screen wondering what happened. So
 * this is one address that does the whole of it: sends them to create an
 * account if they have none, puts them in the church through the church's own
 * join code, and asks the group's leader.
 *
 * It asks rather than adds. R9.6 gives a leader the say over who is in their
 * group, and a published group is an invitation to ask rather than a door
 * standing open.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const here = `/g/${slug}/${id}/join`;

  const user = await currentUser();
  if (!user) redirect(`/sign-up?next=${encodeURIComponent(here)}`);

  const found = await joinCodeForPublicGroup(slug, id);
  if (!found) redirect(`/g/${slug}/${id}`);

  // Through the church's own door first, where they are not already inside it.
  const church = await resolveTenantBySlug(slug);
  if (!church) redirect(`/g/${slug}/${id}`);

  const mine = await membershipsForUser(user.id);
  if (!mine.some((one) => one.tenantId === church.id)) {
    await joinWithCode({
      code: found.code,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        emailVerified: user.emailVerified,
      },
    });
  }

  await withTenant(
    { tenantId: church.id, role: "member", userId: user.id },
    (tx) =>
      requestToJoin(
        tx,
        { tenantId: church.id, role: "member", userId: user.id },
        { groupId: found.groupId },
      ),
  );

  redirect(`/home?church=${slug}`);
}

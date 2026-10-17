import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import {
  withTenant, groupForPublicJoin, joinChurch, requestToJoin, resolveTenantBySlug,
  membershipsForUser,
} from "@connectapp/db";
import { currentUser, emailIsVerified } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * R9.5, R9.6. Following a published group all the way in.
 *
 * A visitor reading a group on the church's website presses Join and should
 * end up in the group rather than on a sign-in screen with no explanation. One
 * address handles the whole sequence: create an account if they have none, join
 * the church through its own entry point, and raise a request with the group's
 * leader.
 *
 * It raises a request rather than adding them. R9.6 gives the leader the
 * decision over who is in their group, so publishing a group invites a request
 * rather than granting entry.
 *
 * POST, because it writes. It used to be a GET, which meant opening the address
 * was the whole transaction and anything that followed a link performed it.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const here = `/g/${slug}/${id}/join`;

  const user = await currentUser();
  if (!user) redirect(`/sign-up?next=${encodeURIComponent(here)}`);

  const found = await groupForPublicJoin(slug, id);
  if (!found) redirect(`/g/${slug}/${id}`);

  const church = await resolveTenantBySlug(slug);
  if (!church) redirect(`/g/${slug}/${id}`);

  // Through the church's own door first, where they are not already inside it.
  const mine = await membershipsForUser(user.id);
  if (!mine.some((one) => one.tenantId === church.id)) {
    await joinChurch({
      slug,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: await emailIsVerified(),
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

  redirect("/home");
}

/**
 * Somebody who followed the address without pressing the button, or came back
 * to it, just sees the group.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  redirect(`/g/${slug}/${id}`);
}

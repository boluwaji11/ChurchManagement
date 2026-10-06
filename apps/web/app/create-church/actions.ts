"use server";

import { redirect } from "next/navigation";
import { createChurch } from "@connectapp/db";
import { explain } from "@/lib/explain";
import { currentUser } from "@/lib/session";

export interface CreateResult {
  error?: string;
}

/**
 * Creates a church and makes the signed-in person its Owner.
 *
 * The user comes from the session, never from the form. A church's first Owner
 * is the strongest grant in the product, and a form field is not where that
 * decision gets made.
 */
export async function createChurchAccount(data: FormData): Promise<CreateResult> {
  const user = await currentUser();
  if (!user) redirect("/sign-in?next=/create-church");

  const name = String(data.get("name") ?? "");
  const timezone = String(data.get("timezone") ?? "");

  let slug: string;
  try {
    const church = await createChurch({
      name,
      timezone,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified,
      },
    });
    slug = church.slug;
  } catch (error) {
    return { error: explain(error) };
  }

  redirect(`/members?church=${slug}&welcome=1`);
}

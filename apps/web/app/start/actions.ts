"use server";

import { redirect } from "next/navigation";
import { createChurch, InvalidInputError } from "@hearth/db";
import { currentUser } from "@/lib/session";

export interface StartResult {
  error?: string;
}

/**
 * Creates a church and makes the signed-in person its Owner.
 *
 * The user comes from the session, never from the form. A church's first Owner
 * is the strongest grant in the product, and a form field is not where that
 * decision gets made.
 */
export async function startChurch(data: FormData): Promise<StartResult> {
  const user = await currentUser();
  if (!user) redirect("/sign-in?next=/start");

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
        emailVerified: user.emailVerified,
      },
    });
    slug = church.slug;
  } catch (error) {
    if (error instanceof InvalidInputError) return { error: error.message };
    throw error;
  }

  redirect(`/people?church=${slug}&welcome=1`);
}

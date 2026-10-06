"use server";

import { redirect } from "next/navigation";
import { joinChurch } from "@connectapp/db";
import { explain } from "@/lib/explain";
import { currentUser } from "@/lib/session";

/** R1.7. Going through the door, with whatever the church's records say. */
export async function join(slug: string): Promise<void> {
  const user = await currentUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(`/join/${slug}`)}`);

  let outcome;
  try {
    outcome = await joinChurch({
      slug,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    redirect(`/join/${slug}?error=${encodeURIComponent(explain(error))}`);
  }

  redirect(`/home?church=${outcome.slug}`);
}

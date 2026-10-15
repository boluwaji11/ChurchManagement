"use server";

import { redirect } from "next/navigation";
import { joinChurch } from "@connectapp/db";
import { explain } from "@/lib/explain";
import { currentUser, emailIsVerified } from "@/lib/session";
import { rememberChurch } from "@/lib/church-choice";

/** R1.7. Going through the door, with whatever the church's records say. */
export async function join(slug: string): Promise<void> {
  const user = await currentUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(`/join/${slug}`)}`);

  try {
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
  } catch (error) {
    redirect(`/join/${slug}?error=${encodeURIComponent(explain(error))}`);
  }

  // R1.4. The church they just joined is the one they are looking at.
  await rememberChurch(slug);
  redirect("/home");
}

"use server";

import { redirect } from "next/navigation";
import { joinWithCode } from "@hearth/db";
import { explain } from "@/lib/explain";
import { currentUser } from "@/lib/session";

/** R1.7. Going through the door, with whatever the church's records say. */
export async function join(code: string): Promise<void> {
  const user = await currentUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(`/join/${code}`)}`);

  let outcome;
  try {
    outcome = await joinWithCode({
      code,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    redirect(`/join/${code}?error=${encodeURIComponent(explain(error))}`);
  }

  if (outcome.status === "waiting") redirect("/choose-church");
  redirect(`/home?church=${outcome.slug}`);
}

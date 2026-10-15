"use server";

import { redirect } from "next/navigation";
import { createChurch } from "@connectapp/db";
import { explain } from "@/lib/explain";
import { currentUser, emailIsVerified } from "@/lib/session";
import { rememberChurch } from "@/lib/church-choice";

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
  const country = String(data.get("country") ?? "");
  const website = String(data.get("website") ?? "");
  /* R22.1. Unanswered stays unanswered: a radio nobody touched is not a no. */
  const asked = String(data.get("hasWebsite") ?? "");
  const hasWebsite = asked === "yes" ? true : asked === "no" ? false : null;

  let slug: string;
  try {
    const church = await createChurch({
      name,
      timezone,
      country,
      website,
      hasWebsite,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: await emailIsVerified(),
      },
    });
    slug = church.slug;
  } catch (error) {
    return { error: explain(error) };
  }

  /*
   * R1.4. The church they just founded is the one they are looking at.
   * Founding a second one would otherwise land on the chooser between them.
   */
  await rememberChurch(slug);

  /*
   * R22.1. Straight into the product, where the guide is already beside the
   * screen on its first step. Setting up used to be a page of its own, which
   * meant a church met a list of links before it had seen the product the
   * links go to.
   */
  redirect("/dashboard");
}

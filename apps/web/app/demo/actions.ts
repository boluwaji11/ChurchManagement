"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { createDemoChurch, topUpDemoPool } from "@hearth/db";
import { issueDemoPass, newDemoUserId } from "@/lib/demo-pass";

/**
 * R19.7 and R22.1. A church to look around.
 *
 * A demo that starts with a sign-up form is a demo for the people who were
 * going to sign up anyway.
 *
 * The visitor gets a throwaway church of their own, filled with invented people
 * and thrown away tomorrow, and a signed cookie naming it. Nothing they press
 * can reach a real church: the cookie is signed, and the session layer refuses
 * any church without a demo expiry in the future.
 */
export async function startDemo() {
  const userId = newDemoUserId();
  const demo = await createDemoChurch(userId);
  await issueDemoPass(demo.tenantId, userId, demo.expiresAt);

  // Building the replacement happens after this response, so the wait lands on
  // nobody. A visitor who presses the button gets a church that was ready.
  after(async () => {
    try {
      await topUpDemoPool();
    } catch {
      // The next visitor builds their own, slowly, which is the old behaviour
      // rather than a failure.
    }
  });

  redirect(`/people?church=${demo.slug}`);
}

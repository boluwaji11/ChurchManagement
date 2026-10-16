"use server";

import { cookies } from "next/headers";
import { withTenant, dismissSetup, skipSetupStep, type SetupStep } from "@connectapp/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";
import { forgetShell } from "@/lib/shell-data";
import { GUIDE_COOKIE } from "./guide-cookie";

export interface GuideResult {
  error?: string;
}


/**
 * R22.1. Whether the guide is open or down to its tab.
 *
 * A cookie for the same reason the sidebar's width is one: the server draws it
 * the way it was left, so nobody watches a rail slide shut after the screen has
 * already arrived. It is per person rather than per church, because two
 * administrators working at once should not collapse each other's rail.
 */
export async function setGuideShut(shut: boolean): Promise<void> {
  const jar = await cookies();
  if (!shut) {
    jar.delete(GUIDE_COOKIE);
    return;
  }
  jar.set(GUIDE_COOKIE, "1", {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

/** R22.1. Skipping a step, and the same button undoing it. */
export async function skip(step: SetupStep, on: boolean): Promise<GuideResult> {
  const session = await requireSession();
  try {
    await withTenant(session, (tx) => skipSetupStep(tx, session, step, on));
  } catch (error) {
    return { error: explain(error) };
  }
  // The frame holds its read for twenty seconds, which is long enough for a
  // church to press Skip for now and watch nothing happen.
  forgetShell(session);
  return {};
}

/**
 * R22.1. Skipping everything still open, in one press.
 *
 * A church that knows it is not doing any of the rest should not have to say
 * so sixteen times. Each one is still skipped on its own terms, so each one
 * can be undone on its own terms afterwards.
 */
export async function skipAll(steps: SetupStep[]): Promise<GuideResult> {
  const session = await requireSession();
  try {
    await withTenant(session, async (tx) => {
      for (const step of steps) await skipSetupStep(tx, session, step, true);
    });
  } catch (error) {
    return { error: explain(error) };
  }
  forgetShell(session);
  return {};
}

/** R22.1. Putting it away, and Settings bringing it back. */
export async function showGuide(show: boolean): Promise<GuideResult> {
  const session = await requireSession();
  try {
    await withTenant(session, (tx) => dismissSetup(tx, session, !show));
  } catch (error) {
    return { error: explain(error) };
  }
  forgetShell(session);
  return {};
}

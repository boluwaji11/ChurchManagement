import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { clearDemoPass } from "@/lib/demo-pass";
import { forgetChurch } from "@/lib/church-choice";
import { DEV_PASS } from "@/lib/dev-gate";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  // A demo visitor has no Supabase session to end, only the pass they carry.
  await clearDemoPass();
  // R1.4. The church they were looking at goes with the session.
  await forgetChurch();
  /*
   * HRT-402. The sandbox pass goes with the session too.
   *
   * It was minted for one account after reading the team list, so leaving it
   * behind means signing out and still being inside: the next request walks
   * past the gate on a pass belonging to somebody who has just left, and
   * lands on the marketing page rather than the door.
   */
  (await cookies()).delete(DEV_PASS);
  return NextResponse.redirect(`${new URL(request.url).origin}/`);
}

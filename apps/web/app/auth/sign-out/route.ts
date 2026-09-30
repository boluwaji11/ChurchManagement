import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { clearDemoPass } from "@/lib/demo-pass";

export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  // A demo visitor has no Supabase session to end, only the pass they carry.
  await clearDemoPass();
  return NextResponse.redirect(`${new URL(request.url).origin}/`);
}

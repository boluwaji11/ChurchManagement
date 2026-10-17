import { redirect } from "next/navigation";
import { platform } from "@connectapp/db";
import { supabaseServer } from "@/lib/supabase/server";
import { gated } from "@/lib/dev-gate";
import { Gate } from "./gate";

export const dynamic = "force-dynamic";

export const metadata = { title: "Development - ConnectApp" };

/**
 * HRT-402, R21.x. The door in front of the development deployment.
 *
 * Written here rather than in the catalogue, like the admin portal's own
 * screens: a church never sees this, and a string a church never sees does not
 * belong in the file that is translated for them.
 */
export default async function DevGatePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (!gated()) redirect("/");

  const { next } = await searchParams;
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  const member = user ? await platform.platformAdmin(user.id) : null;

  return (
    <Gate
      next={next && next.startsWith("/") ? next : "/"}
      email={user?.email ?? null}
      onTheTeam={member !== null}
    />
  );
}

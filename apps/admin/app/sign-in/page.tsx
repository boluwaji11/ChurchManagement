import { redirect } from "next/navigation";
import { Banner } from "@connectapp/ui";
import { whereWeAre } from "@connectapp/env";
import { teamMember } from "@/lib/admin";
import { Brand } from "@/components/brand";
import { EnvironmentBar } from "@/components/environment-bar";
import { SignInForm } from "./form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sign in - ConnectApp Admin" };

/** R21.x. The one door into the portal. */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await teamMember()) redirect("/");
  const here = whereWeAre();
  /* HRT-401. An invitation link that did not work sends them here saying why,
     and a door that drops the reason leaves somebody pressing a dead link
     again. Trimmed, because it arrives in an address bar. */
  const { error } = await searchParams;
  const said = error?.slice(0, 200);

  return (
    <main className="site-wash flex min-h-dvh flex-col">
      <EnvironmentBar environment={here.environment} productionData={here.productionData} />

      <div className="grid flex-1 place-items-center px-6 py-10">
        <div className="flex w-full max-w-[380px] flex-col gap-6">
          {/* Over the box rather than off its left edge, so the mark and the
              card share one centre line. */}
          <div className="flex items-center justify-center gap-2.5">
            <Brand size="md" />
          </div>

          {said ? <Banner tone="danger" title="That link didn't work">{said}</Banner> : null}

          <SignInForm />
        </div>
      </div>
    </main>
  );
}

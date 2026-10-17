import { redirect } from "next/navigation";
import { Banner } from "@connectapp/ui";
import { environment } from "@connectapp/env";
import { teamMember } from "@/lib/admin";
import { Brand } from "@/components/brand";
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
  const env = environment();
  /* HRT-401. An invitation link that did not work sends them here saying why,
     and a door that drops the reason leaves somebody pressing a dead link
     again. Trimmed, because it arrives in an address bar. */
  const { error } = await searchParams;
  const said = error?.slice(0, 200);

  return (
    <main className="site-wash grid min-h-dvh place-items-center px-6 py-10">
      <div className="flex w-full max-w-[380px] flex-col gap-6">
        {/* Over the box rather than off its left edge, so the mark and the
            card share one centre line. */}
        <div className="flex items-center justify-center gap-2.5">
          <Brand size="md" />
        </div>

        {said ? <Banner tone="danger" title="That link did not work">{said}</Banner> : null}

        <SignInForm />

        {/* HRT-397. Which set of records is behind this door. Production is
            the ordinary case and says nothing; anything else is marked, so
            nobody signs in to development thinking it is the real thing, or
            the other way round. */}
        {env === "production" ? null : (
          <p className="text-center text-caption font-semibold tracking-[0.06em] text-ember-800 uppercase">
            {env}
          </p>
        )}
      </div>
    </main>
  );
}

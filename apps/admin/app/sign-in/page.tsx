import { redirect } from "next/navigation";
import { operator } from "@/lib/admin";
import { Brand } from "@/components/brand";
import { SignInForm } from "./form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sign in - ConnectApp Admin" };

/** R21.x. The one door into the portal. */
export default async function SignInPage() {
  if (await operator()) redirect("/");

  return (
    <main className="site-wash grid min-h-dvh place-items-center px-6 py-10">
      <div className="flex w-full max-w-[380px] flex-col gap-6">
        {/* Over the box rather than off its left edge, so the mark and the
            card share one centre line. */}
        <div className="flex items-center justify-center gap-2.5">
          <Brand size="md" />
        </div>

        <SignInForm />
      </div>
    </main>
  );
}

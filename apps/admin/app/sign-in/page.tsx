import { redirect } from "next/navigation";
import { operator } from "@/lib/admin";
import { SignInForm } from "./form";

export const dynamic = "force-dynamic";

/** R21.x. The one door into the portal. */
export default async function SignInPage() {
  if (await operator()) redirect("/");

  return (
    <main className="site-wash grid min-h-dvh place-items-center px-6 py-10">
      <div className="flex w-full max-w-[380px] flex-col gap-6">
        <div className="flex items-center gap-2.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-[11px] bg-primary text-[16px] font-semibold text-primary-fg">
            C
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-display text-[19px] text-fg">ConnectApp</span>
            <span className="text-[12px] font-medium tracking-[0.08em] text-primary uppercase">
              Admin
            </span>
          </span>
        </div>

        <SignInForm />
      </div>
    </main>
  );
}

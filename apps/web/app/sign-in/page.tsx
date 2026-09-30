import { redirect } from "next/navigation";
import { Banner } from "@hearth/ui";
import { currentUser } from "@/lib/session";
import { SignInForm } from "./form";
import { Logo } from "@/components/brand";

export const dynamic = "force-dynamic";

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string; next?: string }>;
}) {
  const params = await searchParams;
  if (await currentUser()) redirect(params.next ?? "/people");

  return (
    <main className="grid min-h-dvh place-items-center px-6 py-16">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Logo size="lg" />
          <p className="text-[length:var(--d-text-body)] text-fg-muted">Sign in to your church.</p>
        </div>

        {params.error ? (
          <Banner tone="danger" title="That did not work">
            {params.error}
          </Banner>
        ) : null}

        {params.sent ? (
          <Banner tone="success" title="Check your email">
            We sent a sign-in link to {params.sent}. It is good for one hour.
          </Banner>
        ) : null}

        <SignInForm next={params.next} />
      </div>
    </main>
  );
}

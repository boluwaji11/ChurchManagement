import Link from "next/link";
import { redirect } from "next/navigation";
import { Banner } from "@hearth/ui";
import { currentUser } from "@/lib/session";
import { SignInForm } from "./form";

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
        <div className="flex flex-col gap-4">
          <div aria-hidden className="flex items-end gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 rounded-full bg-accent"
                style={{ height: `${0.875 + i * 0.375}rem`, opacity: 0.45 + i * 0.275 }}
              />
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-display text-fg">Hearth</h1>
            <p className="text-[length:var(--d-text-body)] text-fg-muted">
              Sign in to your church.
            </p>
          </div>
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

        <p className="text-caption text-fg-subtle">
          Nothing to look at yet?{" "}
          <Link href="/design" className="underline hover:text-fg">
            The design system
          </Link>{" "}
          needs no account.
        </p>
      </div>
    </main>
  );
}

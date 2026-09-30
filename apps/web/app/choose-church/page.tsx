import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Church, Plus } from "lucide-react";
import { membershipsForUser } from "@hearth/db";
import { Banner, Button } from "@hearth/ui";
import { currentUser } from "@/lib/session";
import { SignOutButton } from "@/components/sign-out-button";
import { BrandBar } from "@/components/brand";

export const dynamic = "force-dynamic";

const REASONS: Record<string, { title: string; body: string }> = {
  none: {
    title: "Your account is not in a church yet",
    body: "Create one below, or wait to be invited.",
  },
  denied: {
    title: "That church is not available to you",
    body: "Either it does not exist or you are not a member of it. We do not say which, on purpose.",
  },
};

export default async function ChooseChurch({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const memberships = await membershipsForUser(user.id);
  const notice = reason ? REASONS[reason] : undefined;

  return (
    <div className="flex min-h-dvh flex-col">
      <BrandBar right={<SignOutButton />} />

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 px-6 py-12">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-display text-fg">Choose a church</h1>
        <p className="text-[length:var(--d-text-body)] text-fg-muted">Signed in as {user.email}</p>
      </div>

      {notice ? (
        <Banner tone={reason === "denied" ? "warning" : "info"} title={notice.title}>
          {notice.body}
        </Banner>
      ) : null}

      {memberships.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {memberships.map((m) => (
            <li key={m.tenantId}>
              <Link
                href={`/people?church=${m.tenantSlug}`}
                className="group flex items-center justify-between gap-4 rounded-lg border border-line bg-surface p-4 shadow-sm transition-[border-color,box-shadow] duration-fast hover:border-line-strong hover:shadow-md"
              >
                <span className="flex items-center gap-3">
                  <Church className="size-5 text-fg-muted" aria-hidden />
                  <span className="flex flex-col">
                    <span className="text-title text-fg">{m.tenantName}</span>
                    <span className="text-caption text-fg-muted">{m.role.replace(/_/g, " ")}</span>
                  </span>
                </span>
                <ArrowRight className="size-4 text-fg-subtle transition-transform duration-fast group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <Button asChild variant={memberships.length > 0 ? "secondary" : "primary"} full>
        <Link href="/create-church">
          <Plus /> Create a church account
        </Link>
      </Button>

      </main>
    </div>
  );
}

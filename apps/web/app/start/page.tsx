import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { currentUser } from "@/lib/session";
import { StartForm } from "./form";

export const dynamic = "force-dynamic";

export default async function StartPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in?next=/start");

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-6 py-16">
      <Link
        href="/choose-church"
        className="inline-flex items-center gap-1.5 text-label text-fg-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" /> Back
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="font-display text-display text-fg">Start your church</h1>
        <p className="text-[length:var(--d-text-body)] text-fg-muted">You will be the owner.</p>
      </div>

      <StartForm />
    </main>
  );
}

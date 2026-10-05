import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { currentUser } from "@/lib/session";
import { CreateChurchForm } from "./form";
import { BrandBar } from "@/components/brand";
import { SignOutButton } from "@/components/sign-out-button";
import { t } from "@connectapp/i18n";

export const dynamic = "force-dynamic";

export default async function StartPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in?next=/create-church");

  return (
    <div className="flex min-h-dvh flex-col">
      <BrandBar right={<SignOutButton />} />

      <main id="main" className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 px-6 py-12">
      <Link
        href="/choose-church"
        className="inline-flex items-center gap-1.5 text-label text-fg-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" /> {t("action.back")}
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="font-display text-display text-fg">{t("createChurch.title")}</h1>
      </div>

      <CreateChurchForm />
      </main>
    </div>
  );
}

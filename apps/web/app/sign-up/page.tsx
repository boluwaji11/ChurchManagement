import { redirect } from "next/navigation";
import { Banner } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { currentUser } from "@/lib/session";
import { AuthShell } from "../auth-shell";
import type { Piece } from "@/components/site/art";
import { SignUpForm } from "./form";

export const dynamic = "force-dynamic";

/** The margins of the sign-up screen, drawn as the website draws them. */
const ART: Piece[] = [
  { name: "congregation", side: "left", y: 52, size: 230, inset: 24 },
  { name: "sanctuary", side: "right", y: 52, size: 250, inset: 16 },
];

/** R1.7, R22.1. Where somebody with no account begins. */
export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; sent?: string }>;
}) {
  const params = await searchParams;
  if (await currentUser()) redirect(params.next ?? "/choose-church");

  return (
    <AuthShell
      title={t("signUp.title")}
      under={t("signUp.free")}
      step={1}
      art={ART}
      width="max-w-[520px]"
    >
      {params.error ? (
        <Banner tone="danger" title={t("signUp.failed")}>{params.error}</Banner>
      ) : null}

      {params.sent ? (
        <Banner tone="success" title={t("signUp.sent.title")}>
          {t("signUp.sent.body", { email: params.sent })}
        </Banner>
      ) : (
        <SignUpForm next={params.next} />
      )}
    </AuthShell>
  );
}

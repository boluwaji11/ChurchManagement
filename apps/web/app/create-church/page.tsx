import { redirect } from "next/navigation";
import { t } from "@connectapp/i18n";
import { currentUser } from "@/lib/session";
import { CreateChurchForm } from "./form";
import { AuthShell } from "../auth-shell";
import { SignOutButton } from "@/components/sign-out-button";
import type { Piece } from "@/components/site/art";

export const dynamic = "force-dynamic";

/** The margins of the second step, drawn as the first step draws them. */
const ART: Piece[] = [
  { name: "gathering", side: "left", y: 52, size: 250, inset: 16 },
  { name: "sanctuary", side: "right", y: 52, size: 250, inset: 16 },
];

/** R1.1, R22.1. The second step: the church this account is starting. */
export default async function StartPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in?next=/create-church");

  return (
    <AuthShell
      title={t("createChurch.title")}
      step={2}
      art={ART}
      width="max-w-[520px]"
      footer={<SignOutButton />}
    >
      <CreateChurchForm />
    </AuthShell>
  );
}

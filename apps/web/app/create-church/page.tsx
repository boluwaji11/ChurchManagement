import { redirect } from "next/navigation";
import { t } from "@connectapp/i18n";
import { currentUser } from "@/lib/session";
import { CreateChurchForm } from "./form";
import { AuthShell } from "../auth-shell";
import { SignedInAs } from "@/components/signed-in-as";
import type { Piece } from "@/components/site/art";
import { publicTab } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata() {
  return publicTab(t("createChurch.title"));
}

/** The margins of the second step, drawn as the first step draws them. */
const ART: Piece[] = [
  { name: "gathering", side: "left", y: 52, size: 250, inset: 16 },
  { name: "sanctuary", side: "right", y: 52, size: 250, inset: 16 },
];

/** R1.1, R22.1. The second step: the church this account is starting. */
export default async function StartPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in?next=/create-church");

  const first = user.firstName?.trim() || user.fullName?.trim().split(/\s+/)[0];

  return (
    <AuthShell
      title={first ? t("createChurch.greeting", { name: first }) : t("createChurch.title")}
      step={2}
      art={ART}
      width="max-w-[520px]"
      bar={<SignedInAs email={user.email} />}
    >
      <CreateChurchForm />
    </AuthShell>
  );
}

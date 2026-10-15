import { redirect } from "next/navigation";
import { Banner } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { currentUser, churchFromHost } from "@/lib/session";
import { resolveTenantBySlug } from "@connectapp/db";
import { AuthShell } from "../auth-shell";
import type { Piece } from "@/components/site/art";
import { SignUpForm } from "./form";
import { SignUpSent } from "./sent";
import { publicTab } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata() {
  return publicTab(t("signUp.title"));
}

/** The margins of the sign-up screen, drawn as the website draws them. */
const ART: Piece[] = [
  { name: "congregation", side: "left", y: 52, size: 230, inset: 24 },
  { name: "sanctuary", side: "right", y: 52, size: 250, inset: 16 },
];

/** R1.7, R22.1. Where somebody with no account begins. */
export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; sent?: string; email?: string }>;
}) {
  const params = await searchParams;
  if (await currentUser()) redirect(params.next ?? "/choose-church");

  /*
   * R17.1. Whose address this is, where it is a church's.
   *
   * Somebody creating an account at riverside.connectapp.church is joining
   * Riverside, and the three steps of starting a church are not what they
   * are doing, so the screen names the church and drops the steps.
   */
  const church = await churchFromHost();
  const named = church ? await resolveTenantBySlug(church) : null;

  return (
    <AuthShell
      title={
        params.sent
          ? t("signUp.sent.title")
          : named
            ? t("signUp.atChurch", { name: named.name })
            : t("signUp.title")
      }
      /* R17.1. Nothing under it on a church's own door: the heading says
         which church, and the sentence selling the product to a pastor is
         not what somebody joining a congregation came to read. */
      under={params.sent || named ? undefined : t("signUp.free")}
      step={named ? undefined : 1}
      /* R24.6. The way back to the church's own door, where somebody came
         from to get here. */
      back={named ? { href: "/join", label: t("signIn.backTo", { name: named.name }) } : undefined}
      art={ART}
      width="max-w-[520px]"
    >
      {params.error ? (
        <Banner tone="danger">{params.error}</Banner>
      ) : null}

      {params.sent ? (
        <SignUpSent email={params.sent} next={params.next} />
      ) : (
        /* R1.7. An invitation is matched on the verified address, so the
           link in one carries the address it was sent to. */
        <SignUpForm next={params.next} email={params.email} />
      )}
    </AuthShell>
  );
}

import { redirect } from "next/navigation";
import { withTenant, setupProgress, canManageChurch } from "@connectapp/db";
import { Banner } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
import { SiteBar, SiteFooter } from "@/components/site/chrome";
import { AuthSteps } from "../auth-shell";
import { Art, type Piece } from "@/components/site/art";
import { SignedInAs } from "@/components/signed-in-as";
import { requireSession, currentUser } from "@/lib/session";
import { Steps } from "./steps";
import { SETUP_LINKS } from "@/lib/setup-links";

export const dynamic = "force-dynamic";

/**
 * One drawing, large and faint, behind the column rather than beside it. The
 * church itself, because that is the thing this page is setting up.
 */
const ART: Piece[] = [
  { name: "sanctuary", side: "right", y: 58, size: 620, inset: -110, faint: true },
];

/**
 * R22.1, R22.3. The first hour, and the last step of getting in.
 *
 * It sits outside the product's own frame rather than inside it. Somebody here
 * has had an account for ninety seconds: the sidebar is a map of a building
 * they have not walked around yet, and the rail at the top of this page is the
 * one they have been following since the website. They land in the product when
 * they are done, which is the moment the sidebar starts meaning something.
 */
export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);
  const user = await currentUser();

  // R1.3. Nobody else's business, and it is not their screen to put away.
  if (!canManageChurch(session)) {
    return (
      <AppShell session={session} title={t("setup.title")}>
        <Banner tone="info" title={t("setup.title")}>{t("forbidden.askAdmin")}</Banner>
      </AppShell>
    );
  }

  const progress = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    (tx) => setupProgress(tx, session.tenantId),
  );

  // Somebody who has already put this away is looking at nothing.
  if (progress.dismissed) redirect(`/dashboard?church=${session.tenantSlug}`);

  return (
    <div data-theme="light" className="site-wash flex min-h-dvh flex-col">
      <SiteBar>{user ? <SignedInAs email={user.email} /> : null}</SiteBar>

      <main id="main" className="relative flex flex-1 justify-center px-6 pb-14 pt-10">
        <Art pieces={ART} />

        <div className="relative flex w-full max-w-[860px] flex-col gap-8">
          <AuthSteps at={3} />

          <Steps
            church={session.tenantSlug}
            person={session.displayName.split(" ")[0] || undefined}
            settled={progress.settled}
            left={progress.left}
            steps={progress.steps.map((step) => ({
              step: step.step,
              done: step.done,
              skipped: step.skipped,
              href: SETUP_LINKS[step.step],
            }))}
          />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

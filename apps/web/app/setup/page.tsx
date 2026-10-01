import { withTenant, setupProgress, canManageChurch } from "@hearth/db";
import { Banner } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { PageTitle } from "@/components/section";
import { AppHeader } from "@/components/app-header";
import { requireSession } from "@/lib/session";
import { Steps } from "./steps";
import { SETUP_LINKS } from "@/lib/setup-links";

export const dynamic = "force-dynamic";

/**
 * R22.1, R22.3. The first hour.
 *
 * Five things a church does once, each linking to the screen that does it. The
 * target is under sixty minutes from signing up to a directory somebody can
 * use, and the way to miss that target is to build a parallel set of forms
 * nobody can find again in March.
 */
export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  if (!canManageChurch(session.role)) {
    return (
      <>
        <AppHeader session={session} />
        <main id="main" className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <Banner tone="info" title={t("setup.title")}>{t("forbidden.askAdmin")}</Banner>
        </main>
      </>
    );
  }

  const progress = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    (tx) => setupProgress(tx, session.tenantId),
  );

  return (
    <>
      <AppHeader session={session} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <PageTitle title={t("setup.title")} className="mb-6" />
        <Steps
          church={session.tenantSlug}
          settled={progress.settled}
          steps={progress.steps.map((step) => ({
            step: step.step,
            done: step.done,
            skipped: step.skipped,
            href: SETUP_LINKS[step.step],
          }))}
        />
      </main>
    </>
  );
}

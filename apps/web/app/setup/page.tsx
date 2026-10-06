import { withTenant, setupProgress, canManageChurch } from "@connectapp/db";
import { Banner } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
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
  searchParams: Promise<{ church?: string; welcome?: string }>;
}) {
  const { church, welcome } = await searchParams;
  const session = await requireSession(church);

  if (!canManageChurch(session)) {
    return (
      <AppShell
        session={session}
        title={t("setup.title")}
      >
        <Banner tone="info" title={t("setup.title")}>{t("forbidden.askAdmin")}</Banner>
      </AppShell>
    );
  }

  const progress = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    (tx) => setupProgress(tx, session.tenantId),
  );

  return (
    <AppShell
      session={session}
      title={t("setup.title")}
    >
      {welcome ? (
        <Banner
          tone="success"
          title={t("createChurch.welcome.title", { church: session.tenantName })}
          className="mb-6"
        >
          {t("createChurch.welcome.body")}
        </Banner>
      ) : null}

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
    </AppShell>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Church, Plus } from "lucide-react";
import { membershipsForUser, canEditPeople, canReadIncidents } from "@connectapp/db";
import { Banner, Button, LIFT } from "@connectapp/ui";
import { currentUser } from "@/lib/session";
import { SignOutButton } from "@/components/sign-out-button";
import { BrandBar } from "@/components/brand";
import { JoinWithCode } from "./join-with-code";
import { t } from "@connectapp/i18n";

export const dynamic = "force-dynamic";

const REASONS = ["none", "denied"] as const;
const isReason = (value: string | undefined): value is (typeof REASONS)[number] =>
  REASONS.includes(value as (typeof REASONS)[number]);

export default async function ChooseChurch({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const memberships = await membershipsForUser(user.id);
  const notice = isReason(reason) ? reason : undefined;

  return (
    <div className="flex min-h-dvh flex-col">
      <BrandBar right={<SignOutButton />} />

      <main id="main" className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 px-6 py-12">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-display text-fg">
          {memberships.length > 0 ? t("chooseChurch.title") : t("chooseChurch.getIn")}
        </h1>
        <p className="text-[length:var(--d-text-body)] text-fg-muted">
          {t("chooseChurch.signedInAs", { email: user.email })}
        </p>
      </div>

      {notice ? (
        <Banner tone={notice === "denied" ? "warning" : "info"} title={t(`chooseChurch.${notice}.title`)}>
          {t(`chooseChurch.${notice}.body`)}
        </Banner>
      ) : null}

      {memberships.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {memberships.map((m) => (
            <li key={m.tenantId}>
              <Link
                href={`${
                  canEditPeople(m.role as never) || canReadIncidents(m.role as never)
                    ? "/members"
                    : "/home"
                }?church=${m.tenantSlug}`}
                className={`group flex items-center justify-between gap-4 rounded-lg border border-line bg-surface p-4 shadow-sm ${LIFT}`}
              >
                <span className="flex items-center gap-3">
                  <Church className="size-5 text-fg-muted" aria-hidden />
                  <span className="flex flex-col">
                    <span className="text-title text-fg">{m.tenantName}</span>
                    <span className="text-caption text-fg-muted">{t(`role.${m.role}`)}</span>
                  </span>
                </span>
                <ArrowRight className="size-4 text-fg-subtle transition-transform duration-fast group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <JoinWithCode />

      <Button asChild variant="ghost" full>
        <Link href="/create-church">
          <Plus /> {t("createChurch.title")}
        </Link>
      </Button>

      </main>
    </div>
  );
}

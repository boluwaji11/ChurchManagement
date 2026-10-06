import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Church, Plus } from "lucide-react";
import { membershipsForUser, canEditPeople, canReadIncidents } from "@connectapp/db";
import { Banner, Button, LIFT } from "@connectapp/ui";
import { currentUser } from "@/lib/session";
import { SignOutButton } from "@/components/sign-out-button";
import { AuthShell, AUTH_BUTTON } from "../auth-shell";
import { JoinWithCode } from "./join-with-code";
import type { Piece } from "@/components/site/art";
import { t } from "@connectapp/i18n";

export const dynamic = "force-dynamic";

const REASONS = ["none", "denied"] as const;
const isReason = (value: string | undefined): value is (typeof REASONS)[number] =>
  REASONS.includes(value as (typeof REASONS)[number]);

/** The margins, drawn the way the first step of the flow draws them. */
const ART: Piece[] = [
  { name: "gathering", side: "left", y: 52, size: 250, inset: 16 },
  { name: "sanctuary", side: "right", y: 52, size: 250, inset: 16 },
];

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
    <AuthShell
      title={memberships.length > 0 ? t("chooseChurch.title") : t("chooseChurch.getIn")}
      under={t("chooseChurch.signedInAs", { email: user.email })}
      step={2}
      art={ART}
      width="max-w-[520px]"
      footer={<SignOutButton />}
    >
      {notice ? (
        <Banner tone={notice === "denied" ? "warning" : "info"} title={t(`chooseChurch.${notice}.title`)}>
          {t(`chooseChurch.${notice}.body`)}
        </Banner>
      ) : null}

      {memberships.length > 0 ? (
        <ul className="flex list-none flex-col gap-2 p-0">
          {memberships.map((m) => (
            <li key={m.tenantId}>
              <Link
                href={`${
                  canEditPeople(m.role as never) || canReadIncidents(m.role as never)
                    ? "/members"
                    : "/home"
                }?church=${m.tenantSlug}`}
                className={`group flex items-center justify-between gap-4 rounded-xl border border-line bg-surface p-4 no-underline shadow-sm ${LIFT}`}
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

      {/* Somebody who has just verified an address and belongs to nothing is
          here to start a church. The code is the other way in, under a rule,
          for the member who was handed one. */}
      {memberships.length === 0 ? (
        <>
          <Button asChild full className={AUTH_BUTTON}>
            <Link href="/create-church">
              <Plus /> {t("createChurch.title")}
            </Link>
          </Button>

          <div className="flex items-center gap-3 text-[13px] text-fg-subtle">
            <span className="h-px flex-1 bg-line" />
            {t("chooseChurch.orCode")}
            <span className="h-px flex-1 bg-line" />
          </div>

          <JoinWithCode secondary />
        </>
      ) : (
        <>
          <JoinWithCode secondary />

          <Button asChild variant="ghost" full className={AUTH_BUTTON}>
            <Link href="/create-church">
              <Plus /> {t("createChurch.title")}
            </Link>
          </Button>
        </>
      )}
    </AuthShell>
  );
}

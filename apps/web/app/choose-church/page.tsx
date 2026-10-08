import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Church, Plus } from "lucide-react";
import { membershipsForUser, resolveTenantBySlug } from "@connectapp/db";
import { landingForRole } from "@/lib/landing";
import { Banner, Button, LIFT } from "@connectapp/ui";
import { currentUser } from "@/lib/session";
import { SignedInAs } from "@/components/signed-in-as";
import { AuthShell } from "../auth-shell";
import { AUTH_BUTTON } from "../auth-chrome";
import type { Piece } from "@/components/site/art";
import { t } from "@connectapp/i18n";
import { publicTab } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata() {
  return publicTab(t("chooseChurch.title"));
}

const REASONS = ["none", "denied", "which"] as const;
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
  searchParams: Promise<{ reason?: string; asked?: string }>;
}) {
  const { reason, asked } = await searchParams;
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const memberships = await membershipsForUser(user.id);
  const notice = isReason(reason) ? reason : undefined;

  /*
   * R1.4. The church by the name it calls itself. The address carries its
   * slug, which is how the product writes it down and not how anybody says
   * it. A church with no name to resolve leaves the sentence general.
   */
  const asking = asked ? (await resolveTenantBySlug(asked))?.name : undefined;

  return (
    <AuthShell
      title={memberships.length > 0 ? t("chooseChurch.title") : t("chooseChurch.getIn")}
      /*
       * R24.6. The three steps belong to setting up, and somebody already in
       * a church is not setting one up: they are here because an address
       * named a church they are not in. Showing them a progress bar through
       * a signup they finished months ago says they have gone backwards.
       */
      step={memberships.length === 0 ? 2 : undefined}
      art={ART}
      width="max-w-[520px]"
      bar={<SignedInAs email={user.email} />}
    >
      {/* R1.4. Which church was asked for, where the address named one.
          "That church is not available to you" with no name in it leaves
          somebody in two churches wondering which one it meant. */}
      {notice ? (
        <Banner
          tone={notice === "denied" ? "warning" : "info"}
          title={
            notice === "denied" && asking
              ? t("chooseChurch.denied.named", { church: asking })
              : t(`chooseChurch.${notice}.title`)
          }
        >
          {t(`chooseChurch.${notice}.body`)}
        </Banner>
      ) : null}

      {memberships.length > 0 ? (
        <ul className="flex list-none flex-col gap-2 p-0">
          {memberships.map((m) => (
            <li key={m.tenantId}>
              <Link
                /* R1.4. The same screen signing in to that church would
                   open, so picking one out of a list and signing in to it
                   land in the same place. */
                href={`${landingForRole(m.role)}?church=${m.tenantSlug}`}
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

      {/* R1.7. Two things only: a church they are already in, or a new one.
          A member arrives through their own church's address rather than
          through here, so there is nothing to type. */}
      <Button
        asChild
        full
        variant={memberships.length > 0 ? "ghost" : "primary"}
        className={AUTH_BUTTON}
      >
        <Link href="/create-church">
          <Plus /> {t("createChurch.title")}
        </Link>
      </Button>
    </AuthShell>
  );
}

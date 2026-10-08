import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@connectapp/ui";
import { t, type MessageKey } from "@connectapp/i18n";
import type { PermissionAction, TenantRole } from "@connectapp/db";

/**
 * R1.5. The screen somebody's role does not open.
 *
 * One answer everywhere, in the middle of the page, because a banner at the
 * top of an otherwise empty screen reads as a notice about the screen rather
 * than as the screen itself. The refusal that matters is in the query layer;
 * this is what it looks like.
 *
 * It says three things, because "Access denied" says one and leaves the
 * reader with nowhere to go: what cannot be opened, which role they are on
 * and what that role cannot do, and the way out. The sentence in the middle
 * is the same one the data layer writes when it refuses a save, so a church
 * reads one explanation rather than two.
 */
export function Denied({
  role,
  action,
  church,
  back,
}: {
  /** The role they are on, which is half the explanation. */
  role?: TenantRole;
  /** What the screen needed, named the way every other refusal names it. */
  action?: PermissionAction;
  /** R1.4. Where the way out goes, within their own church. */
  church?: string;
  /** Where the way out goes, when it is not their own first screen. */
  back?: { href: string; label: string };
}) {
  const why =
    role && action
      ? t("error.permission", {
          role: t(`role.${role}` as MessageKey),
          action: t(`error.permission.${action}` as MessageKey),
        })
      : t("forbidden.body");

  const home = back ?? {
    href: church ? `/home?church=${church}` : "/home",
    label: t("forbidden.back"),
  };

  return (
    <div className="grid min-h-[50vh] place-items-center px-6 py-10">
      <div className="flex max-w-[420px] flex-col items-center gap-4 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-sunken text-fg-muted [&_svg]:size-5">
          <Lock aria-hidden />
        </span>

        <span className="flex flex-col gap-1.5">
          <span className="font-display text-[22px] leading-7 text-fg">
            {t("forbidden.denied")}
          </span>
          <span className="text-[length:var(--d-text-body)] text-fg-muted">{why}</span>
          <span className="text-[13px] text-fg-subtle">{t("forbidden.ask")}</span>
        </span>

        <Button asChild variant="secondary">
          <Link href={home.href}>{home.label}</Link>
        </Button>
      </div>
    </div>
  );
}

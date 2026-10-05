import { withTenant, getChurch, type TenantRole } from "@connectapp/db";

/**
 * R1.1. The church's own colour, on the surfaces its congregation sees.
 *
 * A rule across the top rather than a repainted interface. The twelve hues are
 * matched for lightness and chroma precisely so one can be swapped in without
 * anybody checking contrast again, and a product that lets a church pick its
 * own body text colour is a product that ships unreadable screens.
 *
 * It appears where somebody is being handed something by their church: the
 * member's home, the directory, the group finder, a serving request, and
 * anything printed. Not on the admin screens, where the person is working in
 * the software rather than receiving something from the church.
 */
export async function BrandRule({
  tenantId,
  role,
  className,
}: {
  tenantId: string;
  role: TenantRole;
  className?: string;
}) {
  const profile = await withTenant({ tenantId, role }, (tx) => getChurch(tx, tenantId));
  const hue = profile?.brandHue ?? "indigo";

  return (
    <div
      aria-hidden
      className={className ?? "h-1 w-full"}
      style={{ background: `var(--hue-${hue}-500)` }}
    />
  );
}

/**
 * R1.1. The same rule, where the hue is already in hand.
 *
 * Printed sheets read the church once for the whole page, so they pass the hue
 * in rather than asking again for a strip of colour.
 */
export function BrandRuleFor({ hue, className }: { hue: string; className?: string }) {
  return (
    <div
      aria-hidden
      className={className ?? "h-1 w-full"}
      style={{ background: `var(--hue-${hue}-500)` }}
    />
  );
}

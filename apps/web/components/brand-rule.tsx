import { withTenant, getChurch, type TenantRole } from "@connectapp/db";
import { brandOf } from "@/lib/brand";

/**
 * R1.1. The church's own colour, on the surfaces its congregation sees.
 *
 * A rule across the top rather than a repainted interface. The church picks
 * any colour it likes, and what is drawn is that colour's hue at the product's
 * own lightness: a brand chosen on a logo against white is not a colour
 * anybody checked a contrast ratio against, and a product that paints with one
 * as given is a product that ships unreadable screens.
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

  return <BrandRuleFor colour={brandOf(profile)["500"]} className={className} />;
}

/**
 * R1.1. The same rule, where the colour is already in hand.
 *
 * Printed sheets read the church once for the whole page, so they pass the
 * colour in rather than asking again for a strip of it.
 */
export function BrandRuleFor({ colour, className }: { colour: string; className?: string }) {
  return (
    <div aria-hidden className={className ?? "h-1 w-full"} style={{ background: colour }} />
  );
}

import Link from "next/link";
import { SortTh as Heading, type SortWay } from "@connectapp/ui";

export type { SortWay };

/**
 * R2.14. A sorting heading whose press is a navigation, not a state change.
 *
 * The sort belongs in the address, so the drawing takes whatever renders a
 * link and this passes the app's own.
 */
export function SortTh(props: Omit<React.ComponentProps<typeof Heading>, "linkAs">) {
  return <Heading {...props} linkAs={Link} />;
}

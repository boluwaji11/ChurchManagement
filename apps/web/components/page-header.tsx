import Link from "next/link";
import { PageHeader as Header, type Crumb } from "@connectapp/ui";

export type { Crumb };

/**
 * R24.6. The screen header, with this app's router behind its trail.
 *
 * The drawing lives in `@connectapp/ui`, which holds no router, so the trail
 * would otherwise be plain anchors and every step back would reload the
 * document and lose the view transition.
 */
export function PageHeader(props: Omit<React.ComponentProps<typeof Header>, "linkAs">) {
  return <Header {...props} linkAs={Link} />;
}

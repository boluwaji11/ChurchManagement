"use client";

import * as React from "react";
import Link from "next/link";

/**
 * R24.12. A link in the navigation, fetched while the pointer is on its way.
 *
 * Every screen here is per-church and therefore dynamic, and Next's own
 * default for a dynamic route fetches only as far as the nearest loading
 * boundary, which is nothing the reader is waiting for. Fetching the whole
 * screen on sight would be the other extreme: fourteen screens rendered on
 * every page load, for a church that pays nothing and a server that answers
 * every church.
 *
 * So it is fetched on the intent to go: the pointer arriving on the row, a
 * finger touching it, the row taking focus. That is 150ms to 300ms before the
 * press, which is most of what a navigation costs now that the frame is a
 * layout and only the screen is fetched.
 *
 * `unstable_dynamicOnHover` is the prop that does it. It is in Next's own
 * types for the app router's Link and not in the one `next/link` exports, so
 * the cast is here, once, rather than at each of the five places that want it.
 */
const Warm = Link as React.ComponentType<
  React.ComponentProps<typeof Link> & { unstable_dynamicOnHover?: boolean }
>;

export function NavLink(props: React.ComponentProps<typeof Link>) {
  return <Warm {...props} unstable_dynamicOnHover />;
}

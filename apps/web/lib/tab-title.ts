/**
 * R17.1. What the browser tab says.
 *
 * A member keeps several tabs open and reads the strip, so the tab names the
 * screen and the church it belongs to. Somebody who helps at two churches can
 * tell their giving from the other one's.
 */
export function tabTitle(page: string | undefined, church: string): string {
  const name = page?.trim();
  return name ? `${name} - ${church}` : church;
}

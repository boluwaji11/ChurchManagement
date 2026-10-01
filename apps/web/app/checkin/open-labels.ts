/**
 * R8.11. Opening the label window, and knowing when it did not.
 *
 * A browser that blocks the popup returns null and says nothing. The station
 * then asked the volunteer whether the labels printed, with no window and no
 * way to work out why. The caller gets false and can offer the link instead.
 */
export function openLabels(href: string): boolean {
  const window_ = window.open(href, "hearth-labels", "width=520,height=720");
  return window_ !== null;
}

/**
 * R2.1. The names under /members that are screens rather than people.
 *
 * The record panel is an intercepting route at `@panel/(.)[id]`, and a dynamic
 * segment matches any single name, so a press on "Mailer" handed the panel
 * `id = "mailer"` and the real screen never rendered. The panel stands aside
 * for these, which lets the page under it answer.
 *
 * A directory added beside this one and left out of this list breaks that
 * screen the same way, so a test walks the directory and fails on the omission.
 */
export const MEMBER_SCREEN_NAMES = ["celebrations", "mailer", "new", "print"] as const;

/** Whether this address names one of those screens rather than a person. */
export function isMemberScreen(id: string): boolean {
  return (MEMBER_SCREEN_NAMES as readonly string[]).includes(id);
}

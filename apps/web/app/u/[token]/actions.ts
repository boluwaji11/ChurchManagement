"use server";

import { restoreByToken } from "@connectapp/db";

/**
 * HRT-143, R16.8. Back on the list, for a press that was a mistake.
 *
 * The token is the whole of the authorisation here as well, because somebody
 * who has just taken themselves off by accident is signed in to nothing and
 * has only the screen in front of them.
 */
export async function subscribeAgain(token: string): Promise<boolean> {
  return (await restoreByToken(token)) !== null;
}

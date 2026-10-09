import webpush from "web-push";

/**
 * R16.10. Putting a push on the wire.
 *
 * Kept apart from the queries so the HTTP never happens inside a transaction:
 * a send that takes three seconds through a browser's push service would be a
 * transaction held open for three seconds, and a church on a bad connection
 * would feel it on every save.
 *
 * Silent where the keys are unset, which is every environment that has not
 * been given a pair. A church with no push is a church whose members read the
 * bell, and that is a working church.
 */

export interface PushPayload {
  title: string;
  body: string;
  /** Where pressing it goes, a path within the app. */
  href?: string | null;
  /** The notification's own tag, so two of the same replace rather than stack. */
  tag?: string;
}

export interface PushTarget {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Whether this deployment has been given a key pair to sign with. */
export function pushConfigured(): boolean {
  return Boolean(
    process.env["VAPID_PUBLIC_KEY"]
    && process.env["VAPID_PRIVATE_KEY"]
    && process.env["VAPID_SUBJECT"],
  );
}

/** The public half, which the browser needs to subscribe. */
export const pushPublicKey = (): string | null =>
  process.env["VAPID_PUBLIC_KEY"] ?? null;

/**
 * Sends to every target, and reports the ones whose browser has gone.
 *
 * A 404 or a 410 is the push service saying this subscription is dead, which is
 * the only honest moment to delete the row: a browser that has been uninstalled
 * never tells us.
 */
export async function sendPush(
  targets: PushTarget[],
  payload: PushPayload,
): Promise<{ sent: number; gone: string[]; refused: string[] }> {
  if (!pushConfigured() || targets.length === 0) return { sent: 0, gone: [], refused: [] };

  webpush.setVapidDetails(
    process.env["VAPID_SUBJECT"]!,
    process.env["VAPID_PUBLIC_KEY"]!,
    process.env["VAPID_PRIVATE_KEY"]!,
  );

  const body = JSON.stringify(payload);
  const gone: string[] = [];
  /* What the push service said no to, so a deployment with the wrong keys
     says so somewhere rather than going quiet. */
  const refused: string[] = [];
  let sent = 0;

  await Promise.all(
    targets.map(async (one) => {
      try {
        await webpush.sendNotification(
          { endpoint: one.endpoint, keys: { p256dh: one.p256dh, auth: one.auth } },
          body,
          { TTL: 60 * 60 * 24 },
        );
        sent += 1;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) gone.push(one.id);
        // Anything else is this push failing rather than this browser being
        // gone: a service with a bad minute keeps its row.
        else refused.push(`${status ?? "no status"}: ${(error as Error).message}`);
      }
    }),
  );

  return { sent, gone, refused };
}

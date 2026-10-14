import { drain } from "@/lib/send-worker";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * HRT-141, R16.6. The worker, on a schedule.
 *
 * A send queued while nobody is looking, and a send whose time has come, both
 * leave through here. The kick a church's own press gives is the same work in
 * the same place; this is what catches whatever that kick did not finish.
 */
export async function GET(request: Request): Promise<Response> {
  const secret = process.env["CRON_SECRET"];
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response(null, { status: 401 });
  }

  return Response.json(await drain());
}

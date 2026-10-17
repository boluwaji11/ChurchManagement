import { NextResponse } from "next/server";
import { platformHealth } from "@connectapp/db";
import { environment } from "@connectapp/env";
import { probeEverything } from "@/lib/probes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * HRT-394, N3. The probes, on a clock.
 *
 * Opening the status screen runs them too, but a status screen only knows
 * about the minutes somebody was looking at it. A thing that fails at three in
 * the morning and recovers by eight leaves no trace unless something was
 * asking while nobody was. This is what asks.
 *
 * Called every fifteen minutes by .github/workflows/health.yml, for the same
 * reason the send queue's worker lives there: Vercel's Hobby plan runs a cron
 * once a day, and a service checked once a day is not a service being watched.
 *
 * Held shut by CRON_SECRET. It writes rows and makes seven calls to other
 * people's APIs, so it is not left open.
 */
export async function GET(request: Request) {
  const secret = process.env["CRON_SECRET"];
  if (!secret) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const given = request.headers.get("authorization");
  if (given !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No" }, { status: 401 });
  }

  const env = environment();
  const probes = await probeEverything();

  await Promise.all(
    probes.map((one) =>
      platformHealth.recordCheck(
        { service: one.service, state: one.state, tookMs: one.tookMs, said: one.said },
        env,
      ),
    ),
  );

  /* Thirty days is as far back as anybody has looked, and pruning here means
     there is no second schedule to notice has stopped. */
  await platformHealth.pruneChecks();

  const bad = probes.filter((one) => one.state === "fail");

  /*
   * The status code is the answer, so the workflow that calls this goes red
   * without anybody having to read its output. A warning is not a failure:
   * something slow at three in the morning should not page anybody.
   */
  return NextResponse.json(
    {
      environment: env,
      checked: probes.length,
      failing: bad.map((one) => ({ service: one.service, said: one.said })),
    },
    { status: bad.length > 0 ? 503 : 200 },
  );
}

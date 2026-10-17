import "server-only";
import { owner } from "@connectapp/db";
import { environment } from "@connectapp/env";
import type { Health } from "@/components/state-dot";

/**
 * HRT-394, N3. Asking each thing the platform depends on whether it is there.
 *
 * Read from the far end rather than reasoned about from this one. A key that
 * parses is not a key that works, and the only way to know Stripe will answer
 * is to ask it.
 *
 * Every probe is the cheapest call the provider offers, every probe has its
 * own deadline, and they all go at once: seven services asked one after
 * another is seven timeouts' worth of waiting on the morning everything is
 * down, which is the morning somebody is actually reading this screen.
 */

/** How long any one service gets to answer. */
const BUDGET_MS = 6_000;
/** Over this and it is working, slowly, which is worth saying. */
const SLOW_MS = 1_500;

export interface Shape {
  service: string;
  /** What it is, in the words the screen uses. */
  label: string;
  /** One line on what breaks when this is down. */
  matters: string;
}

export interface Probe extends Shape {
  state: Health;
  tookMs: number | null;
  said: string | null;
}

/**
 * What each service is called and why it matters, apart from the probing.
 *
 * The status screen draws recorded readings when they are fresh enough, and a
 * recorded reading is a service name and a state. The words belong to the
 * service rather than to the reading, so they are kept here and read from both
 * directions.
 */
export const SHAPE: Shape[] = [
  { service: "database", label: "Database", matters: "Everything. No screen renders without it." },
  { service: "supabase", label: "Supabase Auth", matters: "Signing in, for a church and for us." },
  { service: "stripe", label: "Stripe", matters: "Every gift a church receives." },
  { service: "resend", label: "Resend", matters: "The welcome, the approval and every confirmation." },
  { service: "redis", label: "Upstash Redis", matters: "The rate limits in front of the public forms." },
  { service: "queue", label: "The send queue", matters: "Every message a church sends to its people." },
  { service: "web", label: "The product", matters: "What a church actually opens." },
];

const words = (service: string): Shape =>
  SHAPE.find((one) => one.service === service) ?? { service, label: service, matters: "" };

/** A fetch that gives up rather than hanging the screen. */
async function ask(url: string, init: RequestInit = {}): Promise<Response> {
  const stop = AbortSignal.timeout(BUDGET_MS);
  return fetch(url, { ...init, signal: stop, cache: "no-store" });
}

/**
 * A probe that cannot answer in time answers anyway.
 *
 * Every fetch here already carries its own AbortSignal, and that is not
 * enough: a database connection is not a fetch, and postgres.js will wait on
 * the connection pool for as long as the pool makes it wait. The health route
 * on Vercel hung for five minutes and returned nothing at all, which is the
 * one thing a status check must never do. A deadline that reports a service as
 * not answering is information; a request that never returns is not.
 */
function within<T>(ms: number, work: Promise<T>, whenLate: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const late = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(whenLate), ms);
  });
  return Promise.race([work, late]).finally(() => clearTimeout(timer));
}

/** Time one probe and turn anything it throws into a state. */
async function timed(
  service: string,
  work: () => Promise<{ state: Health; said?: string | null }>,
): Promise<Probe> {
  const started = Date.now();
  try {
    const answer = await work();
    const tookMs = Date.now() - started;
    /* Working and slow is its own answer. A probe that takes four seconds is
       telling you something a green light would hide. */
    const state: Health =
      answer.state === "pass" && tookMs > SLOW_MS ? "warn" : answer.state;
    return {
      ...words(service),
      state,
      tookMs,
      said: answer.said ?? (state === "warn" && answer.state === "pass" ? `Took ${tookMs}ms` : null),
    };
  } catch (error) {
    const said = error instanceof Error ? error.message : String(error);
    return {
      ...words(service),
      state: "fail",
      tookMs: Date.now() - started,
      /* A timeout says "The operation was aborted", which names nothing. */
      said: said.includes("abort") || said.includes("timeout")
        ? `No answer inside ${BUDGET_MS / 1000}s`
        : said,
    };
  }
}

const off = (service: string, said: string): Probe => ({
  ...words(service), state: "off", tookMs: null, said,
});

/** The database the whole product is. */
const database = () =>
  timed("database", async () => {
    const rows = await owner()<{ ok: number }[]>`select 1 as ok`;
    return { state: rows[0]?.ok === 1 ? "pass" : "fail" };
  });

/** Supabase Auth, which is the only way anybody signs in. */
const supabase = () => {
  const url = process.env["SUPABASE_URL"] ?? process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) {
    return Promise.resolve(
      off("supabase", "No Supabase URL or key"),
    );
  }

  return timed("supabase", async () => {
    /*
     * The health endpoint wants the key like every other call to the auth API.
     * Without it the answer is 401, which reads as Supabase being down when it
     * is Supabase working correctly and being asked wrongly.
     */
    const answer = await ask(`${url.replace(/\/$/, "")}/auth/v1/health`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (answer.ok) return { state: "pass" };
    return { state: "fail", said: `${answer.status} ${answer.statusText}` };
  });
};

/**
 * Stripe. The balance is the cheapest authenticated call there is, and a
 * restricted key scoped to Connect can still read it.
 */
const stripe = () => {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) return Promise.resolve(off("stripe", "No STRIPE_SECRET_KEY"));

  return timed("stripe", async () => {
    const answer = await ask("https://api.stripe.com/v1/balance", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (answer.ok) return { state: "pass" };
    /*
     * A restricted key may legitimately be refused the balance while being
     * perfectly good for what this platform does with it. That is a key
     * Stripe recognised, which is what the probe is asking.
     */
    if (answer.status === 403) return { state: "pass", said: "Key is good, scoped away from the balance" };
    const body = (await answer.json().catch(() => null)) as { error?: { message?: string } } | null;
    return { state: "fail", said: body?.error?.message ?? `${answer.status} ${answer.statusText}` };
  });
};

/** Resend, which carries the welcome, the approval and every confirmation. */
const resend = () => {
  const key = process.env["RESEND_API_KEY"];
  if (!key) {
    return Promise.resolve(
      off("resend", "No RESEND_API_KEY"),
    );
  }

  return timed("resend", async () => {
    const answer = await ask("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (answer.ok) return { state: "pass" };
    const body = (await answer.json().catch(() => null)) as { message?: string } | null;
    return { state: "fail", said: body?.message ?? `${answer.status} ${answer.statusText}` };
  });
};

/** Upstash, which is what stops one address trying a thousand passwords. */
const redis = () => {
  const url = process.env["UPSTASH_REDIS_REST_URL"];
  const token = process.env["UPSTASH_REDIS_REST_TOKEN"];
  if (!url || !token) {
    return Promise.resolve(
      off("redis", "No Upstash credentials"),
    );
  }

  return timed("redis", async () => {
    const answer = await ask(`${url.replace(/\/$/, "")}/ping`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (answer.ok) return { state: "pass" };
    return { state: "fail", said: `${answer.status} ${answer.statusText}` };
  });
};

/**
 * The product itself, from the outside.
 *
 * The one probe that proves the whole path rather than one dependency: DNS,
 * the certificate, Vercel, the app, and a render that reaches the database.
 */
const web = () => {
  const host = process.env["PLATFORM_HOST"];
  if (!host || host === "localhost") {
    return Promise.resolve(
      off("web", "Nothing to reach in development"),
    );
  }

  return timed("web", async () => {
    const answer = await ask(`https://${host}/`, { redirect: "manual" });
    /* A redirect to the sign-in screen is the product answering. */
    if (answer.ok || (answer.status >= 300 && answer.status < 400)) return { state: "pass" };
    return { state: "fail", said: `${answer.status} ${answer.statusText}` };
  });
};

/**
 * HRT-394, R16.6. The send queue's worker, which is the one piece of this
 * product that can be dead while every screen looks fine.
 *
 * Nothing to call: the worker is a GitHub Actions schedule, and what it leaves
 * behind is the evidence. Rows claimed over an hour ago and never finished
 * mean a worker was killed part way through; a queue with something in it and
 * nothing moving means the schedule has stopped.
 */
const queue = () =>
  timed("queue", async () => {
    const rows = await owner()<{ waiting: number; stuck: number; old: number }[]>`
      select
        (select count(*)::int from email_recipients where state = 'queued') as waiting,
        (select count(*)::int from email_recipients
          where state = 'sending' and claimed_at < now() - interval '1 hour') as stuck,
        (select count(*)::int from email_recipients
          where state = 'queued' and at < now() - interval '30 minutes'
            and (next_try is null or next_try < now())) as old`;
    const found = rows[0];
    if (!found) return { state: "fail", said: "The queue could not be read" };

    if (found.stuck > 0) {
      return { state: "fail", said: `${found.stuck} copies claimed over an hour ago and never finished` };
    }
    if (found.old > 0) {
      return { state: "warn", said: `${found.old} copies have been waiting over half an hour` };
    }
    return { state: "pass", said: found.waiting > 0 ? `${found.waiting} waiting their turn` : null };
  });

/** Every probe, at once. */
export async function probeEverything(): Promise<Probe[]> {
  const late = (service: string): Probe => ({
    ...words(service),
    state: "fail",
    tookMs: BUDGET_MS,
    said: `No answer inside ${BUDGET_MS / 1000}s`,
  });

  return Promise.all(
    ([
      ["database", database],
      ["supabase", supabase],
      ["stripe", stripe],
      ["resend", resend],
      ["redis", redis],
      ["queue", queue],
      ["web", web],
    ] as const).map(([service, run]) =>
      /* A second over the budget each probe already works to, so a probe that
         is about to answer is not cut off by the net below it. */
      within(BUDGET_MS + 1_000, run(), late(service)),
    ),
  );
}

/** What environment these answers belong to, for the row they are written as. */
export const probeEnvironment = (): string => environment();

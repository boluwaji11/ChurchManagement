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

export interface Probe {
  service: string;
  /** What it is, in the words the screen uses. */
  label: string;
  /** One line on what breaks when this is down. */
  matters: string;
  state: Health;
  tookMs: number | null;
  said: string | null;
}

/** A fetch that gives up rather than hanging the screen. */
async function ask(url: string, init: RequestInit = {}): Promise<Response> {
  const stop = AbortSignal.timeout(BUDGET_MS);
  return fetch(url, { ...init, signal: stop, cache: "no-store" });
}

/** Time one probe and turn anything it throws into a state. */
async function timed(
  service: string,
  label: string,
  matters: string,
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
      service,
      label,
      matters,
      state,
      tookMs,
      said: answer.said ?? (state === "warn" && answer.state === "pass" ? `Took ${tookMs}ms` : null),
    };
  } catch (error) {
    const said = error instanceof Error ? error.message : String(error);
    return {
      service,
      label,
      matters,
      state: "fail",
      tookMs: Date.now() - started,
      /* A timeout says "The operation was aborted", which names nothing. */
      said: said.includes("abort") || said.includes("timeout")
        ? `No answer inside ${BUDGET_MS / 1000}s`
        : said,
    };
  }
}

const off = (service: string, label: string, matters: string, said: string): Probe => ({
  service, label, matters, state: "off", tookMs: null, said,
});

/** The database the whole product is. */
const database = () =>
  timed("database", "Database", "Everything. No screen renders without it.", async () => {
    const rows = await owner()<{ ok: number }[]>`select 1 as ok`;
    return { state: rows[0]?.ok === 1 ? "pass" : "fail" };
  });

/** Supabase Auth, which is the only way anybody signs in. */
const supabase = () => {
  const url = process.env["SUPABASE_URL"] ?? process.env["NEXT_PUBLIC_SUPABASE_URL"];
  if (!url) return Promise.resolve(off("supabase", "Supabase Auth", "Signing in, for a church and for us.", "No SUPABASE_URL"));

  return timed("supabase", "Supabase Auth", "Signing in, for a church and for us.", async () => {
    const answer = await ask(`${url.replace(/\/$/, "")}/auth/v1/health`);
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
  if (!key) return Promise.resolve(off("stripe", "Stripe", "Every gift a church receives.", "No STRIPE_SECRET_KEY"));

  return timed("stripe", "Stripe", "Every gift a church receives.", async () => {
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
      off("resend", "Resend", "The welcome, the approval and every confirmation.", "No RESEND_API_KEY"),
    );
  }

  return timed("resend", "Resend", "The welcome, the approval and every confirmation.", async () => {
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
      off("redis", "Upstash Redis", "The rate limits in front of the public forms.", "No Upstash credentials"),
    );
  }

  return timed("redis", "Upstash Redis", "The rate limits in front of the public forms.", async () => {
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
      off("web", "The product", "What a church actually opens.", "Nothing to reach in development"),
    );
  }

  return timed("web", "The product", "What a church actually opens.", async () => {
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
  timed("queue", "The send queue", "Every message a church sends to its people.", async () => {
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
  return Promise.all([database(), supabase(), stripe(), resend(), redis(), queue(), web()]);
}

/** What environment these answers belong to, for the row they are written as. */
export const probeEnvironment = (): string => environment();

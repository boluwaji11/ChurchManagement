/**
 * HRT-397, R21.x. Which environment this process is, and whether the keys it
 * holds agree.
 *
 * For a year there was one of everything: one Supabase project, one Stripe
 * account, one Resend grant, and one `.env.local` holding the live credentials
 * for all of them. `pnpm dev` on a laptop read and wrote the real database,
 * which is the arrangement where a seed script, a test send or a careless
 * delete reaches a church. This module is the thing that makes the two tell
 * each other apart.
 *
 * It is deliberately small and has no dependencies, because it is read at the
 * top of the process before anything else is set up, and because every app and
 * the database package all import it.
 */

export type Environment = "production" | "preview" | "development";

const ENVIRONMENTS = new Set<string>(["production", "preview", "development"]);

/**
 * The production Supabase project.
 *
 * Written down rather than configured, because the point of it is to catch a
 * configuration that is wrong. A reference is not a secret: it is the host in
 * `NEXT_PUBLIC_SUPABASE_URL`, which is in the markup of every page the product
 * has ever served.
 */
export const PRODUCTION_SUPABASE_REF = "nvdovjuqcnxacvhxfrmi";

/** The development project, for the same reason. */
export const DEVELOPMENT_SUPABASE_REF = "koaegntsyvvulioesufn";

/**
 * What this process is.
 *
 * Declared rather than inferred. `NODE_ENV` is not consulted at all: a
 * production build served from a laptop, which is how every screen in this
 * repository is checked before it is handed over, sets `NODE_ENV=production`
 * and is not production. An environment nobody has declared is treated as
 * development, so the only way to be production is to say so.
 */
export function environment(): Environment {
  const declared = process.env["CONNECTAPP_ENV"]?.trim().toLowerCase();
  if (declared && ENVIRONMENTS.has(declared)) return declared as Environment;

  const vercel = process.env["VERCEL_ENV"]?.trim().toLowerCase();
  if (vercel && ENVIRONMENTS.has(vercel)) return vercel as Environment;

  return "development";
}

export const isProduction = (): boolean => environment() === "production";

/** The project a Supabase URL names, or null where there is no URL. */
export function supabaseRef(url: string | undefined): string | null {
  if (!url) return null;
  const found = /^https?:\/\/([a-z0-9]+)\.supabase\./i.exec(url.trim());
  return found?.[1]?.toLowerCase() ?? null;
}

/**
 * Which half of Stripe a key belongs to.
 *
 * The mode sits in the middle rather than at the front: `sk_live_` is an
 * ordinary secret key and `rk_live_` is a restricted one, which is what a
 * platform scoped to the calls it makes is issued.
 */
export function stripeMode(key: string | undefined): "live" | "test" | null {
  const value = key?.trim();
  if (!value) return null;
  if (/^[a-z]+_live_/.test(value)) return "live";
  if (/^[a-z]+_test_/.test(value)) return "test";
  return null;
}

export interface Finding {
  /** The variable the complaint is about. */
  name: string;
  /** What is wrong, in one sentence. */
  said: string;
  /**
   * Whether this is the dangerous direction.
   *
   * A production credential outside production is a laptop pointed at a real
   * church, so it stops the process. A development credential inside
   * production is a feature that does not work, which is bad and is not worth
   * taking the live site down over.
   */
  severity: "stop" | "warn";
}

/**
 * Every way the keys in this process disagree with the environment it says it
 * is.
 *
 * Pure, so the operator portal can draw the same answer it would have thrown.
 */
export function check(env: Environment = environment()): Finding[] {
  const found: Finding[] = [];
  const live = env === "production";
  /* A production credential belongs in production. Anywhere else, it stops. */
  const wrongWay = (belongsInProduction: boolean): "stop" | "warn" =>
    belongsInProduction && !live ? "stop" : "warn";

  const stripe = stripeMode(process.env["STRIPE_SECRET_KEY"]);
  if (stripe && (stripe === "live") !== live) {
    found.push({
      name: "STRIPE_SECRET_KEY",
      said: `A ${stripe} mode Stripe key in ${env}.`,
      severity: wrongWay(stripe === "live"),
    });
  }

  const publishable = stripeMode(process.env["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"]);
  if (publishable && (publishable === "live") !== live) {
    found.push({
      name: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
      said: `A ${publishable} mode Stripe key in ${env}.`,
      severity: wrongWay(publishable === "live"),
    });
  }

  const ref = supabaseRef(
    process.env["SUPABASE_URL"] ?? process.env["NEXT_PUBLIC_SUPABASE_URL"],
  );
  if (ref === PRODUCTION_SUPABASE_REF && !live) {
    found.push({
      name: "SUPABASE_URL",
      said: `The production Supabase project in ${env}.`,
      severity: "stop",
    });
  }
  if (ref && ref !== PRODUCTION_SUPABASE_REF && live) {
    found.push({
      name: "SUPABASE_URL",
      said: "A Supabase project that is not the production one, in production.",
      severity: "warn",
    });
  }

  /*
   * The database is checked on its own rather than being taken from the
   * Supabase URL above, because the two are separate variables and the way
   * this goes wrong is one of them being changed and the other being left.
   */
  for (const name of ["DATABASE_URL", "APP_DATABASE_URL"]) {
    const url = process.env[name];
    if (!url) continue;
    const names = `${url}`;
    const production = names.includes(PRODUCTION_SUPABASE_REF);
    if (production && !live) {
      found.push({
        name,
        said: `The production database in ${env}.`,
        severity: "stop",
      });
    }
    if (!production && live && names.includes(DEVELOPMENT_SUPABASE_REF)) {
      found.push({
        name,
        said: "The development database, in production.",
        severity: "warn",
      });
    }
  }

  return found;
}

/**
 * Read the findings out loud, and stop where stopping is the safer answer.
 *
 * Asymmetric on purpose. Live credentials on a laptop are how a real church
 * gets a test email or a real charge, so that throws and the process does not
 * start. The other direction is a product that does not work rather than one
 * that does damage, and a guard that can take the live site down over a
 * misread variable is a worse risk than the thing it guards against. That one
 * is written to the log and drawn on the operator portal's status screen.
 */
export function assertEnvironment(): void {
  const env = environment();
  const found = check(env);
  if (found.length === 0) return;

  for (const one of found) {
    const line = `[connectapp/env] ${one.name}: ${one.said}`;
    if (one.severity === "warn") console.error(line);
  }

  const stop = found.filter((one) => one.severity === "stop");
  if (stop.length === 0) return;

  throw new Error(
    `Refusing to start. This process says it is ${env} and is holding production credentials:\n` +
      stop.map((one) => `  ${one.name}: ${one.said}`).join("\n") +
      "\n\nSee docs/environments.md. To run against production on purpose, set CONNECTAPP_ENV=production.",
  );
}

/** What the environment is pointed at, for a screen that says so. */
export interface Where {
  environment: Environment;
  supabase: string | null;
  stripe: "live" | "test" | null;
  /** Whether this is the project production uses. */
  productionData: boolean;
}

export function whereWeAre(): Where {
  const supabase = supabaseRef(
    process.env["SUPABASE_URL"] ?? process.env["NEXT_PUBLIC_SUPABASE_URL"],
  );
  return {
    environment: environment(),
    supabase,
    stripe: stripeMode(process.env["STRIPE_SECRET_KEY"]),
    productionData: supabase === PRODUCTION_SUPABASE_REF,
  };
}

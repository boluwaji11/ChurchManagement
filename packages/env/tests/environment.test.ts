/**
 * HRT-397. The guard that keeps a laptop off the production database.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  environment, isProduction, stripeMode, supabaseRef, check, assertEnvironment,
  PRODUCTION_SUPABASE_REF, DEVELOPMENT_SUPABASE_REF,
} from "../src/index";

const KEYS = [
  "CONNECTAPP_ENV", "VERCEL_ENV", "NODE_ENV",
  "STRIPE_SECRET_KEY", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL",
  "DATABASE_URL", "APP_DATABASE_URL",
];

let kept: Record<string, string | undefined> = {};

beforeEach(() => {
  kept = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));
  for (const key of KEYS) delete process.env[key];
});

afterEach(() => {
  for (const [key, value] of Object.entries(kept)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("which environment this is", () => {
  it("is development when nobody has said otherwise", () => {
    expect(environment()).toBe("development");
    expect(isProduction()).toBe(false);
  });

  it("is what CONNECTAPP_ENV says", () => {
    process.env["CONNECTAPP_ENV"] = "production";
    expect(environment()).toBe("production");
  });

  it("reads Vercel's own answer where ours is unset", () => {
    process.env["VERCEL_ENV"] = "preview";
    expect(environment()).toBe("preview");
  });

  it("lets ours win over Vercel's", () => {
    process.env["VERCEL_ENV"] = "production";
    process.env["CONNECTAPP_ENV"] = "preview";
    expect(environment()).toBe("preview");
  });

  /*
   * Why NODE_ENV is not consulted. Every screen in this repository is checked
   * by building it and serving it locally, which sets NODE_ENV=production, and
   * none of those runs is production.
   */
  it("is not production just because the build is", () => {
    process.env["NODE_ENV"] = "production";
    expect(environment()).toBe("development");
  });

  it("ignores a word that is not an environment", () => {
    process.env["CONNECTAPP_ENV"] = "staging";
    expect(environment()).toBe("development");
  });
});

describe("reading a key", () => {
  it("tells live from test, standard key or restricted", () => {
    expect(stripeMode("sk_live_abc")).toBe("live");
    expect(stripeMode("rk_live_abc")).toBe("live");
    expect(stripeMode("sk_test_abc")).toBe("test");
    expect(stripeMode("rk_test_abc")).toBe("test");
    expect(stripeMode("")).toBeNull();
    expect(stripeMode(undefined)).toBeNull();
  });

  it("finds the project in a Supabase address", () => {
    expect(supabaseRef("https://abcdef.supabase.co")).toBe("abcdef");
    expect(supabaseRef("https://ABCDEF.supabase.co/")).toBe("abcdef");
    expect(supabaseRef("not a url")).toBeNull();
    expect(supabaseRef(undefined)).toBeNull();
  });
});

describe("the keys against the environment", () => {
  it("says nothing when they agree", () => {
    process.env["STRIPE_SECRET_KEY"] = "sk_test_abc";
    process.env["SUPABASE_URL"] = `https://${DEVELOPMENT_SUPABASE_REF}.supabase.co`;
    expect(check("development")).toEqual([]);
  });

  it("stops a live Stripe key outside production", () => {
    process.env["STRIPE_SECRET_KEY"] = "rk_live_abc";
    const found = check("development");
    expect(found).toHaveLength(1);
    expect(found[0]?.severity).toBe("stop");
    expect(found[0]?.name).toBe("STRIPE_SECRET_KEY");
  });

  /* A product that cannot take a gift, rather than one that takes a real one
     by accident. Worth saying out loud and not worth refusing to boot over. */
  it("only warns about a test key in production", () => {
    process.env["STRIPE_SECRET_KEY"] = "sk_test_abc";
    const found = check("production");
    expect(found).toHaveLength(1);
    expect(found[0]?.severity).toBe("warn");
  });

  it("stops the production Supabase project outside production", () => {
    process.env["SUPABASE_URL"] = `https://${PRODUCTION_SUPABASE_REF}.supabase.co`;
    expect(check("development").map((one) => one.severity)).toContain("stop");
  });

  it("stops the production database outside production", () => {
    process.env["DATABASE_URL"] =
      `postgresql://postgres.${PRODUCTION_SUPABASE_REF}:x@aws-0-us-east-2.pooler.supabase.com:6543/postgres`;
    const found = check("preview");
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ name: "DATABASE_URL", severity: "stop" });
  });

  /*
   * The two variables are separate, and the way this goes wrong is one of
   * them being moved to the dev project and the other being left behind.
   */
  it("catches a half-moved pair", () => {
    process.env["SUPABASE_URL"] = `https://${DEVELOPMENT_SUPABASE_REF}.supabase.co`;
    process.env["APP_DATABASE_URL"] =
      `postgresql://hearth_app.${PRODUCTION_SUPABASE_REF}:x@aws-0-us-east-2.pooler.supabase.com:6543/postgres`;
    expect(check("development")).toEqual([
      expect.objectContaining({ name: "APP_DATABASE_URL", severity: "stop" }),
    ]);
  });
});

describe("what it does about it", () => {
  it("throws on the dangerous direction, naming the variable", () => {
    process.env["CONNECTAPP_ENV"] = "development";
    process.env["STRIPE_SECRET_KEY"] = "sk_live_abc";
    expect(() => assertEnvironment()).toThrow(/STRIPE_SECRET_KEY/);
  });

  it("carries on when production is holding a test key", () => {
    process.env["CONNECTAPP_ENV"] = "production";
    process.env["STRIPE_SECRET_KEY"] = "sk_test_abc";
    expect(() => assertEnvironment()).not.toThrow();
  });

  it("carries on when there is nothing to complain about", () => {
    process.env["CONNECTAPP_ENV"] = "production";
    process.env["STRIPE_SECRET_KEY"] = "sk_live_abc";
    expect(() => assertEnvironment()).not.toThrow();
  });
});

#!/usr/bin/env node
/**
 * R24.11, N7. Open screens in a real browser and say what happened.
 *
 * Reasoning about a screen is not the same as looking at one. This signs in as
 * a seeded administrator, opens each address given to it against a running
 * server, and reports what the browser reported: anything thrown, anything
 * logged as an error, a request that failed, and how long the screen took to
 * settle. A shot of each screen lands in the output directory.
 *
 *   node scripts/browser-check.mjs /dashboard /members /giving
 *   BASE=http://localhost:4489 node scripts/browser-check.mjs /settings/teams
 *
 * The session is built the way the browser would hold it: a password grant
 * against Supabase, written into the cookie `@supabase/ssr` reads. The seeded
 * password comes from the root `.env.local`, so this only ever works against a
 * development database.
 *
 * Hover prefetching and streaming behave differently under `next dev`, so run
 * it against a build: `next build` then `next start`.
 */
import { readFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env["BASE"] ?? "http://localhost:4489";
const OUT = process.env["OUT"] ?? "/tmp/connectapp-browser-check";
const WHO = process.env["SEED_USER_EMAIL"] ?? "admin@riverside.example.org";

const env = Object.fromEntries(
  readFileSync(resolve(root, ".env.local"), "utf8")
    .split("\n")
    .filter((line) => line.includes("=") && !line.trimStart().startsWith("#"))
    .map((line) => {
      const at = line.indexOf("=");
      return [line.slice(0, at).trim(), line.slice(at + 1).trim().replace(/^"|"$/g, "")];
    }),
);

const supabase = env["NEXT_PUBLIC_SUPABASE_URL"] ?? env["SUPABASE_URL"];
const key = env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] ?? env["SUPABASE_PUBLISHABLE_KEY"];

/** The session cookie `@supabase/ssr` writes, chunked the way it chunks it. */
async function sessionCookies() {
  const answer = await fetch(`${supabase}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: key, "content-type": "application/json" },
    body: JSON.stringify({ email: WHO, password: env["SEED_USER_PASSWORD"] }),
  });
  if (!answer.ok) throw new Error(`Could not sign in as ${WHO}: ${answer.status}`);

  const session = await answer.json();
  session.expires_at ??= Math.floor(Date.now() / 1000) + (session.expires_in ?? 3600);

  const value = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  const name = `sb-${new URL(supabase).hostname.split(".")[0]}-auth-token`;
  const MAX = 3180;
  const { hostname } = new URL(BASE);

  const parts = value.length <= MAX
    ? [{ name, value }]
    : Array.from({ length: Math.ceil(value.length / MAX) }, (_, i) => ({
        name: `${name}.${i}`,
        value: value.slice(i * MAX, (i + 1) * MAX),
      }));

  return parts.map((part) => ({ ...part, domain: hostname, path: "/" }));
}

const paths = process.argv.slice(2);
if (paths.length === 0) {
  console.error("Give it at least one address, for example /dashboard");
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.addCookies(await sessionCookies());

let failed = 0;

for (const path of paths) {
  const page = await context.newPage();
  const trouble = [];

  /*
   * Two things a local build says that mean nothing. Vercel's own scripts are
   * not served outside Vercel, and a prefetch is cancelled whenever the page
   * stops waiting for it, which is every time this script closes a page.
   */
  const noise = (url) => url.includes("/_vercel/") || url.includes("_rsc=");

  page.on("console", (message) => {
    const text = message.text();
    if (message.type() === "error" && !text.includes("Failed to load resource")) {
      trouble.push(`console: ${text}`);
    }
  });
  page.on("pageerror", (error) => trouble.push(`threw: ${error.message}`));
  page.on("requestfailed", (request) => {
    if (noise(request.url())) return;
    trouble.push(`request failed: ${request.url()} ${request.failure()?.errorText ?? ""}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400 && !noise(response.url())) {
      trouble.push(`${response.status()} ${response.url()}`);
    }
  });

  const began = Date.now();
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 60_000 });
  const took = Date.now() - began;

  const shot = `${OUT}${path.replace(/\//g, "_") || "_root"}.png`;
  await page.screenshot({ path: shot, fullPage: true });

  const title = await page.title();
  const heading = await page.locator("h1").first().textContent().catch(() => null);

  console.log(`${path}  ${took}ms  tab: ${title}  heading: ${heading?.trim() ?? "none"}`);
  for (const line of trouble) {
    failed += 1;
    console.log(`   ${line}`);
  }
  console.log(`   shot: ${shot}`);

  await page.close();
}

await browser.close();
process.exit(failed > 0 ? 1 : 0);

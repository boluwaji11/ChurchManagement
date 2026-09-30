import type { Config } from "drizzle-kit";

export default {
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  },
  // Roles, RLS policies, grants, and the audit trigger are hand-written in
  // migrations/9999_security.sql. Drizzle owns table shape, not security.
  verbose: true,
  strict: true,
} satisfies Config;

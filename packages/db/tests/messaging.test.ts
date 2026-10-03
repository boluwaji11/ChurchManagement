/**
 * HRT-137. The church's own mail account (R16.1, R21.15).
 *
 * What is being held is somebody else's secret, so the tests are mostly about
 * the password: that it is encrypted before it reaches the database, that it
 * never comes back out to a screen, and that a form left blank keeps the one
 * already stored rather than wiping it.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { withTenant, closeConnections, type Tx } from "../src/client";
import {
  getEmailProvider, emailConnection, proposedConnection, saveEmailProvider,
  removeEmailProvider, type SmtpInput,
} from "../src/repo/messaging";
import { InvalidInputError } from "../src/errors";
import { PermissionError } from "../src/roles";
import type { TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
const SLUG = "messagingtest";
const PASSWORD = "hunter2-not-a-real-password";

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

const account = (over: Partial<SmtpInput> = {}): SmtpInput => ({
  host: "smtp.example.org",
  port: 587,
  secure: false,
  username: "hello@example.org",
  password: PASSWORD,
  fromEmail: "Hello@Example.org",
  fromName: "Example Church",
  replyTo: null,
  ...over,
});

beforeAll(async () => {
  tenant = await testTenant(SLUG, "Messaging Test Church");
});

afterAll(async () => {
  await dropTenants(SLUG);
  await closeConnections();
});

describe("the church's own mail account", () => {
  it("reads as nothing set up before anybody fills it in", async () => {
    expect(await run((tx) => getEmailProvider(tx))).toBeNull();
    expect(await run((tx) => emailConnection(tx))).toBeNull();
  });

  it("saves the account and lowercases the address it sends from", async () => {
    await run((tx) => saveEmailProvider(tx, as(), account()));

    const saved = await run((tx) => getEmailProvider(tx));
    expect(saved).toMatchObject({
      host: "smtp.example.org",
      port: 587,
      secure: false,
      fromEmail: "hello@example.org",
      fromName: "Example Church",
      hasPassword: true,
    });
    expect(saved!.verifiedAt).toBeTruthy();
  });

  it("never hands the password back to a screen", async () => {
    const saved = await run((tx) => getEmailProvider(tx));
    expect(JSON.stringify(saved)).not.toContain(PASSWORD);
  });

  it("writes the password encrypted, so the row alone is no use", async () => {
    const rows = await run((tx) =>
      tx.execute<{ secret_encrypted: string }>(
        sql`select secret_encrypted from provider_credentials where kind = 'smtp'`,
      ),
    );
    const stored = rows[0]!.secret_encrypted;
    expect(stored).not.toContain(PASSWORD);
    expect(stored.startsWith("v1.")).toBe(true);
  });

  it("gives the password only to whatever is about to send", async () => {
    const connection = await run((tx) => emailConnection(tx));
    expect(connection!.password).toBe(PASSWORD);
    expect(connection!.host).toBe("smtp.example.org");
  });

  it("keeps the stored password when the form leaves it blank", async () => {
    await run((tx) => saveEmailProvider(tx, as(), account({ password: "", port: 465, secure: true })));

    const connection = await run((tx) => emailConnection(tx));
    expect(connection!.password).toBe(PASSWORD);
    expect(connection!.port).toBe(465);
    expect(connection!.secure).toBe(true);
  });

  it("builds the connection to test from the form before anything is saved", async () => {
    const proposed = await run((tx) =>
      proposedConnection(tx, as(), account({ host: "smtp.other.org", password: "typed-just-now" })),
    );
    expect(proposed).toMatchObject({ host: "smtp.other.org", password: "typed-just-now" });

    // And nothing was written by testing it.
    expect((await run((tx) => getEmailProvider(tx)))!.host).toBe("smtp.example.org");
  });

  it("refuses a blank server, a silly port and an address that is not one", async () => {
    for (const bad of [
      account({ host: "  " }),
      account({ port: 0 }),
      account({ port: 99999 }),
      account({ username: "" }),
      account({ fromEmail: "not an address" }),
      account({ replyTo: "also not one" }),
    ]) {
      await expect(
        run((tx) => saveEmailProvider(tx, as(), bad)),
      ).rejects.toBeInstanceOf(InvalidInputError);
    }
  });

  it("refuses a first save with no password at all", async () => {
    await run((tx) => removeEmailProvider(tx, as()));
    await expect(
      run((tx) => saveEmailProvider(tx, as(), account({ password: "" }))),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("is refused to anybody who cannot administer the church", async () => {
    for (const role of ["staff", "member"] as TenantRole[]) {
      await expect(
        run((tx) => saveEmailProvider(tx, as(role), account()), role),
      ).rejects.toBeInstanceOf(PermissionError);
    }
  });

  it("takes the account off, and the church falls back to the shared allowance", async () => {
    await run((tx) => saveEmailProvider(tx, as(), account()));
    await run((tx) => removeEmailProvider(tx, as()));

    expect(await run((tx) => getEmailProvider(tx))).toBeNull();
    expect(await run((tx) => emailConnection(tx))).toBeNull();
  });
});

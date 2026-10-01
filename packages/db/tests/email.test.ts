/**
 * HRT-92. The church's own email provider (R16.2).
 *
 * The thing worth testing is what does not come back. A key that can be read
 * off a screen or out of the audit log is a key the church has handed to
 * everybody who can open settings, so both are asserted here rather than left
 * to the shape of a query.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import {
  getEmailSender, saveEmailSender, senderCredentials, recordSendResult, forgetEmailSender,
} from "../src/repo/email";
import { InvalidInputError } from "../src/errors";
import { PermissionError, type TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

const RESEND = {
  provider: "resend",
  fromName: "Riverside Fellowship",
  fromEmail: "Hello@Riverside.Example",
  secret: "re_live_abcdef",
};

beforeAll(async () => {
  tenant = await testTenant("emailtest", "Email Test Church");
});

afterAll(async () => {
  await dropTenants("emailtest");
  await closeConnections();
});

describe("setting it up (R16.2)", () => {
  it("writes it down and lowercases the address", async () => {
    const saved = await run((tx) => saveEmailSender(tx, as(), RESEND));
    expect(saved.provider).toBe("resend");
    expect(saved.fromEmail).toBe("hello@riverside.example");
    expect(saved.hasSecret).toBe(true);
    expect(saved.verifiedAt).toBeNull();
  });

  it("never hands the key back to a screen", async () => {
    const sender = await run((tx) => getEmailSender(tx, tenant));
    expect(Object.values(sender as object)).not.toContain(RESEND.secret);
    expect(JSON.stringify(sender)).not.toContain(RESEND.secret);
  });

  it("hands it to the thing that sends", async () => {
    const credentials = await run((tx) => senderCredentials(tx, tenant));
    expect(credentials!.secret).toBe(RESEND.secret);
  });

  it("stores it as something the database cannot read", async () => {
    const [row] = await owner()`select secret from email_senders where tenant_id = ${tenant}`;
    expect(row!.secret).not.toContain(RESEND.secret);
    expect(String(row!.secret).startsWith("v1.")).toBe(true);
  });

  it("keeps the audit log out of it", async () => {
    const rows = await owner()`
      select before, after from audit_entries
       where tenant_id = ${tenant} and entity = 'email_senders'`;
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(JSON.stringify(row)).not.toContain(RESEND.secret);
      expect(JSON.stringify(row)).not.toContain("secret");
    }
  });

  it("keeps the key on file when the field is left empty", async () => {
    await run((tx) => saveEmailSender(tx, as(), { ...RESEND, secret: "", fromName: "Riverside" }));
    const credentials = await run((tx) => senderCredentials(tx, tenant));
    expect(credentials!.secret).toBe(RESEND.secret);
    expect(credentials!.fromName).toBe("Riverside");
  });
});

describe("what it refuses (R16.2)", () => {
  it("refuses a provider it does not have", async () => {
    await expect(run((tx) => saveEmailSender(tx, as(), { ...RESEND, provider: "pigeon" })))
      .rejects.toBeInstanceOf(InvalidInputError);
  });

  it("refuses an address that is not one", async () => {
    await expect(run((tx) => saveEmailSender(tx, as(), { ...RESEND, fromEmail: "hello" })))
      .rejects.toBeInstanceOf(InvalidInputError);
  });

  it("refuses SMTP with no server to send through", async () => {
    await expect(
      run((tx) => saveEmailSender(tx, as(), {
        provider: "smtp", fromName: "Riverside", fromEmail: "hello@riverside.example",
        secret: "pw", port: 587, username: "hello",
      })),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("refuses a port that is not a port", async () => {
    await expect(
      run((tx) => saveEmailSender(tx, as(), {
        provider: "smtp", fromName: "Riverside", fromEmail: "hello@riverside.example",
        secret: "pw", host: "smtp.example", port: 70000, username: "hello",
      })),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("is owner and admin, and nobody else", async () => {
    for (const role of ["staff", "pastoral", "group_leader", "member"] as const) {
      await expect(
        run((tx) => saveEmailSender(tx, as(role), RESEND), role),
        role,
      ).rejects.toBeInstanceOf(PermissionError);
    }
  });
});

describe("the test send (R16.2)", () => {
  it("records that the provider took one", async () => {
    await run((tx) => recordSendResult(tx, tenant, { ok: true }));
    const sender = await run((tx) => getEmailSender(tx, tenant));
    expect(sender!.verifiedAt).not.toBeNull();
    expect(sender!.lastError).toBeNull();
  });

  it("records what the provider said when it refused one", async () => {
    await run((tx) => recordSendResult(tx, tenant, { ok: false, error: "Domain not verified." }));
    const sender = await run((tx) => getEmailSender(tx, tenant));
    expect(sender!.lastError).toBe("Domain not verified.");
  });

  it("drops the tick when the key changes", async () => {
    await run((tx) => recordSendResult(tx, tenant, { ok: true }));
    await run((tx) => saveEmailSender(tx, as(), { ...RESEND, secret: "re_live_second" }));
    const sender = await run((tx) => getEmailSender(tx, tenant));
    expect(sender!.verifiedAt).toBeNull();
  });
});

describe("another church's provider", () => {
  it("is never read", async () => {
    const otherId = await testTenant("emailtest2", "Other Email Church");
    const theirs = await withTenant({ tenantId: otherId, role: "owner" }, (tx) =>
      getEmailSender(tx, tenant),
    );
    expect(theirs).toBeNull();
    await dropTenants("emailtest2");
  });

  it("goes when the church takes it off", async () => {
    await run((tx) => forgetEmailSender(tx, as()));
    expect(await run((tx) => getEmailSender(tx, tenant))).toBeNull();
  });
});

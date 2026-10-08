/**
 * HRT-267. A mailer that survives a refresh (R16.12).
 *
 * A letter to a congregation is typed over a week, in four-minute gaps, and
 * the screen writes itself down on a timer while somebody is still typing.
 * That makes two rules load-bearing: a half-finished mailer is a valid one,
 * and a field beside the words being odd must never cost the words.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { withTenant, closeConnections, type Tx } from "../src/client";
import {
  createMailer, updateMailer, getMailer, listMailers, setMailerArchived,
} from "../src/repo/mailers";
import { NameTakenError, InvalidInputError } from "../src/errors";
import { PermissionError } from "../src/roles";
import type { TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

beforeAll(async () => {
  tenant = await testTenant("mailers", "Mailer Church");
});

afterAll(async () => {
  await dropTenants("mailers");
  await closeConnections();
});

describe("a mailer", () => {
  it("starts on its name alone, with nothing written in it", async () => {
    const made = await run((tx) => createMailer(tx, as(), { name: "Carol service" }));
    expect(made.body).toBe("");
    expect(made.recipients).toBe("households");
    expect(made.paper).toBe("envelope");

    const back = await run((tx) => getMailer(tx, made.id));
    expect(back?.name).toBe("Carol service");
  });

  it("keeps the words written a moment ago", async () => {
    const made = await run((tx) => createMailer(tx, as(), { name: "Gift day" }));
    await run((tx) => updateMailer(tx, as(), { id: made.id, body: "Dear {first}," }));
    await run((tx) => updateMailer(tx, as(), { id: made.id, body: "Dear {first},\n\nThank you." }));

    const back = await run((tx) => getMailer(tx, made.id));
    expect(back?.body).toBe("Dear {first},\n\nThank you.");
  });

  it("corrects a sheet it has never heard of rather than losing the letter", async () => {
    const made = await run((tx) => createMailer(tx, as(), { name: "Work day" }));
    await run((tx) =>
      updateMailer(tx, as(), { id: made.id, paper: "avery9999", skip: -4, body: "Saturday." }),
    );

    const back = await run((tx) => getMailer(tx, made.id));
    expect(back?.paper).toBe("envelope");
    expect(back?.skip).toBe(0);
    expect(back?.body).toBe("Saturday.");
  });

  it("holds who it goes to, and forgets the list when it stops being one", async () => {
    const made = await run((tx) => createMailer(tx, as(), { name: "Newsletter" }));
    await run((tx) =>
      updateMailer(tx, as(), { id: made.id, recipients: "list", listId: null }),
    );
    expect((await run((tx) => getMailer(tx, made.id)))?.recipients).toBe("list");

    await run((tx) => updateMailer(tx, as(), { id: made.id, recipients: "people" }));
    expect((await run((tx) => getMailer(tx, made.id)))?.recipients).toBe("people");
  });

  it("refuses a second one by the same name", async () => {
    await run((tx) => createMailer(tx, as(), { name: "Members meeting" }));
    await expect(
      run((tx) => createMailer(tx, as(), { name: "Members meeting" })),
    ).rejects.toBeInstanceOf(NameTakenError);
  });

  it("asks for a name", async () => {
    await expect(
      run((tx) => createMailer(tx, as(), { name: "   " })),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("comes off the shelf without leaving the records", async () => {
    const made = await run((tx) => createMailer(tx, as(), { name: "Harvest" }));
    await run((tx) => setMailerArchived(tx, as(), made.id, true));

    const shelf = await run((tx) => listMailers(tx));
    expect(shelf.map((one) => one.id)).not.toContain(made.id);
    expect(await run((tx) => getMailer(tx, made.id))).not.toBeNull();

    const away = await run((tx) => listMailers(tx, { archivedOnly: true }));
    expect(away.map((one) => one.id)).toContain(made.id);
  });

  it("is not written by somebody who cannot edit a member", async () => {
    await expect(
      run((tx) => createMailer(tx, as("member"), { name: "From a member" }), "member"),
    ).rejects.toBeInstanceOf(PermissionError);
  });
});

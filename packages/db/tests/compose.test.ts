/**
 * HRT-139. The composer and the template library (R16.4).
 *
 * Merge fields are the part worth testing hardest. A volunteer gets one wrong
 * once and finds out about it four hundred times, so a name the church cannot
 * fill has to be visible rather than silently blank.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { withTenant, closeConnections, type Tx } from "../src/client";
import {
  MERGE_FIELDS, mergeInto, fieldsUsed, unknownFields,
  listMessageTemplates, saveMessageTemplate, removeMessageTemplate,
} from "../src/repo/compose";
import { InvalidInputError } from "../src/errors";
import { PermissionError } from "../src/roles";
import type { TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
const SLUG = "composetest";

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

const ada = {
  first_name: "Ada",
  last_name: "Lovelace",
  full_name: "Ada Lovelace",
  email: "ada@example.org",
  church: "Riverside",
};

beforeAll(async () => {
  tenant = await testTenant(SLUG, "Compose Test Church");
});

afterAll(async () => {
  await dropTenants(SLUG);
  await closeConnections();
});

describe("merge fields", () => {
  it("puts one person's details into a message", () => {
    expect(mergeInto("Hi {{first_name}}, from {{church}}.", ada))
      .toBe("Hi Ada, from Riverside.");
  });

  it("allows space inside the braces, because somebody will type it", () => {
    expect(mergeInto("Hi {{ first_name }}", ada)).toBe("Hi Ada");
  });

  it("leaves a name the church cannot fill exactly as written", () => {
    const written = "You have given {{pledge_total}} this year.";
    expect(mergeInto(written, ada)).toBe(written);
    expect(unknownFields(written)).toEqual(["pledge_total"]);
  });

  it("writes an empty string where the record has nothing", () => {
    expect(mergeInto("Hi {{first_name}} {{last_name}}", { first_name: "Ada" }))
      .toBe("Hi Ada ");
  });

  it("names which fields a message uses, in the order they appear, once each", () => {
    expect(fieldsUsed("{{church}} to {{first_name}}, from {{church}}"))
      .toEqual(["church", "first_name"]);
  });

  it("covers every field the composer offers", () => {
    const every = MERGE_FIELDS.map((f) => `{{${f}}}`).join(" ");
    expect(unknownFields(every)).toEqual([]);
    expect(mergeInto(every, ada)).not.toContain("{{");
  });
});

describe("the library", () => {
  let id: string;

  it("saves a message under a name", async () => {
    const saved = await run((tx) =>
      saveMessageTemplate(tx, as(), {
        name: "  Welcome  ",
        subject: "Welcome to {{church}}",
        body: "Hi {{first_name}}, glad you came.",
      }),
    );
    id = saved.id;

    const library = await run((tx) => listMessageTemplates(tx));
    expect(library).toHaveLength(1);
    expect(library[0]).toMatchObject({ name: "Welcome", subject: "Welcome to {{church}}" });
  });

  it("edits the one it is on without making a second", async () => {
    await run((tx) =>
      saveMessageTemplate(tx, as(), {
        name: "Welcome",
        subject: "Good to see you",
        body: "Hi {{first_name}}.",
      }, id),
    );

    const library = await run((tx) => listMessageTemplates(tx));
    expect(library).toHaveLength(1);
    expect(library[0]!.subject).toBe("Good to see you");
  });

  it("refuses a second template with a name already taken", async () => {
    await expect(
      run((tx) =>
        saveMessageTemplate(tx, as(), {
          name: "Welcome",
          subject: "Another",
          body: "Another",
        }),
      ),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("refuses a blank name, subject or body", async () => {
    for (const bad of [
      { name: "   ", subject: "A", body: "B" },
      { name: "A", subject: "  ", body: "B" },
      { name: "A", subject: "B", body: "   " },
    ]) {
      await expect(
        run((tx) => saveMessageTemplate(tx, as(), bad)),
      ).rejects.toBeInstanceOf(InvalidInputError);
    }
  });

  it("is refused to anybody who cannot administer the church", async () => {
    for (const role of ["staff", "member"] as TenantRole[]) {
      await expect(
        run((tx) =>
          saveMessageTemplate(tx, as(role), { name: "No", subject: "No", body: "No" }),
          role,
        ),
      ).rejects.toBeInstanceOf(PermissionError);
    }
  });

  it("reads the library by name", async () => {
    await run((tx) =>
      saveMessageTemplate(tx, as(), { name: "Absent", subject: "Missed you", body: "Hello" }),
    );
    expect((await run((tx) => listMessageTemplates(tx))).map((x) => x.name))
      .toEqual(["Absent", "Welcome"]);
  });

  it("deletes one, and refuses to delete it twice", async () => {
    await run((tx) => removeMessageTemplate(tx, as(), id));
    expect((await run((tx) => listMessageTemplates(tx))).map((x) => x.name)).toEqual(["Absent"]);

    await expect(
      run((tx) => removeMessageTemplate(tx, as(), id)),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });
});

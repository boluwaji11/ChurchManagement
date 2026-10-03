/**
 * HRT-140. Who a message goes to (R16.5).
 *
 * A church already keeps its groups of people in the places it works in every
 * day, so targeting reads those rather than asking a volunteer to build a
 * query. The tests are about the reading being right, and about somebody with
 * no email address being counted rather than quietly dropped.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { withTenant, closeConnections, type Tx } from "../src/client";
import { audienceOptions, resolveAudience, recipientsFor } from "../src/repo/audience";
import { createPerson, setPersonArchived } from "../src/repo/people";
import { createTag, setPersonTag } from "../src/repo/tags";
import { seedTeams, listTeams, addToTeam } from "../src/repo/serving";
import { createStaticList } from "../src/repo/lists";
import { InvalidInputError } from "../src/errors";
import type { TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
let worship: string;
let tagId: string;
let listId: string;
const ids: Record<string, string> = {};
const SLUG = "audiencetest";

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

const person = async (firstName: string, email?: string, status = "visitor") => {
  const made = await run((tx) =>
    createPerson(tx, as(), {
      firstName,
      lastName: "Audience",
      lifecycleStatus: status,
      email: email ?? null,
    } as never),
  );
  ids[firstName] = made.id;
  return made.id;
};

beforeAll(async () => {
  tenant = await testTenant(SLUG, "Audience Test Church");

  await person("Ada", "ada@example.org");
  await person("Boma", "boma@example.org");
  // No address on the record, so the audience counts them and cannot reach them.
  await person("Chi");
  await person("Dayo", "dayo@example.org", "member");

  await run((tx) => seedTeams(tx, as()));
  worship = (await run((tx) => listTeams(tx))).find((x) => x.name === "Worship")!.id;
  await run((tx) => addToTeam(tx, as(), { teamId: worship, personId: ids.Ada! }));
  await run((tx) => addToTeam(tx, as(), { teamId: worship, personId: ids.Chi! }));

  tagId = (await run((tx) => createTag(tx, as(), { name: "Newcomer", hue: "teal" }))).id;
  await run((tx) => setPersonTag(tx, as(), ids.Boma!, tagId, true));

  listId = (await run((tx) => createStaticList(tx, as(), { name: "Prayer chain", personIds: [ids.Ada!, ids.Dayo!] }))).id;
});

afterAll(async () => {
  await dropTenants(SLUG);
  await closeConnections();
});

describe("what a church can pick from", () => {
  it("offers its lists, groups, teams, pipelines and tags with how many each holds", async () => {
    const options = await run((tx) => audienceOptions(tx));

    expect(options.lists.find((x) => x.name === "Prayer chain")).toMatchObject({ count: 2 });
    expect(options.teams.find((x) => x.name === "Worship")).toMatchObject({ count: 2 });
    expect(options.tags.find((x) => x.name === "Newcomer")).toMatchObject({ count: 1 });
  });
});

describe("who the choice matches", () => {
  it("everybody means everybody on the books", async () => {
    const found = await run((tx) => resolveAudience(tx, { kind: "everybody" }));
    expect(found).toHaveLength(4);
  });

  it("reads a team, a tag and a saved list", async () => {
    const team = await run((tx) => resolveAudience(tx, { kind: "team", id: worship }));
    expect(team.sort()).toEqual([ids.Ada!, ids.Chi!].sort());

    const tagged = await run((tx) => resolveAudience(tx, { kind: "tag", id: tagId }));
    expect(tagged).toEqual([ids.Boma!]);

    const list = await run((tx) => resolveAudience(tx, { kind: "list", id: listId }));
    expect(list.sort()).toEqual([ids.Ada!, ids.Dayo!].sort());
  });

  it("reads a lifecycle status", async () => {
    const members = await run((tx) => resolveAudience(tx, { kind: "status", id: "member" }));
    expect(members).toEqual([ids.Dayo!]);
  });

  it("leaves out anybody archived", async () => {
    await run((tx) => setPersonArchived(tx, as(), ids.Boma!, true));
    const everybody = await run((tx) => resolveAudience(tx, { kind: "everybody" }));
    expect(everybody).not.toContain(ids.Boma!);
  });

  it("refuses a kind it does not know, and a choice with nothing chosen", async () => {
    await expect(
      run((tx) => resolveAudience(tx, { kind: "newsletter" as never })),
    ).rejects.toBeInstanceOf(InvalidInputError);
    await expect(
      run((tx) => resolveAudience(tx, { kind: "team" })),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });
});

describe("reaching them", () => {
  it("counts somebody with no email address rather than dropping them quietly", async () => {
    const result = await run((tx) => recipientsFor(tx, { kind: "team", id: worship }, "Riverside"));

    expect(result.total).toBe(2);
    expect(result.recipients).toHaveLength(1);
    expect(result.noEmail).toBe(1);
    expect(result.recipients[0]!.email).toBe("ada@example.org");
  });

  it("carries each person's own merge values", async () => {
    const result = await run((tx) => recipientsFor(tx, { kind: "list", id: listId }, "Riverside"));
    const ada = result.recipients.find((r) => r.email === "ada@example.org")!;

    expect(ada.values).toMatchObject({
      first_name: "Ada",
      last_name: "Audience",
      full_name: "Ada Audience",
      church: "Riverside",
    });
  });

  it("reads nothing for a group nobody is in", async () => {
    const options = await run((tx) => audienceOptions(tx));
    const empty = options.teams.find((x) => x.count === 0);
    if (!empty) return;

    const result = await run((tx) => recipientsFor(tx, { kind: "team", id: empty.id }, "Riverside"));
    expect(result).toMatchObject({ total: 0, noEmail: 0 });
    expect(result.recipients).toHaveLength(0);
  });
});

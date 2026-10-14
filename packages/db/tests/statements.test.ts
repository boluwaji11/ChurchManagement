/**
 * HRT-241, HRT-246, HRT-247. Statements, campaigns and the household roll-up
 * (R13.16 to R13.18).
 *
 * The statement is the one thing in this product with a legal shape, so what
 * is tested is the shape: cash totalled, a gift in kind listed and not valued,
 * the acknowledgment line at $250, and a household's gifts on one sheet.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { withTenant, owner, closeConnections, type Tx } from "../src/client";
import { writeFund } from "../src/repo/funds";
import { recordGift } from "../src/repo/giving";
import { createPerson } from "../src/repo/members";
import { createHousehold, addToHousehold } from "../src/repo/households";
import {
  statementFor, statementsFor, statementGivers, setStatementsBy,
} from "../src/repo/statements";
import {
  writeCampaign, listCampaigns, writePledge, listPledges, setCampaignArchived,
} from "../src/repo/campaigns";
import { PermissionError } from "../src/roles";
import type { TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
let general: string;
let building: string;
let ann: string;
let bob: string;
let carl: string;
const SLUG = "statementstest";

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

const person = async (first: string) =>
  (await run((tx) =>
    createPerson(tx, as(), { firstName: first, lastName: "Statementstest" } as never),
  )).id;

const gift = (memberId: string, fundId: string, cents: number, on: string, method = "cash") =>
  run((tx) =>
    recordGift(tx, as(), {
      memberId, fundId, amountCents: cents, method: method as never, receivedOn: on,
    }),
  );

beforeAll(async () => {
  tenant = await testTenant(SLUG, "Statements Test Church");
  general = (await run((tx) => writeFund(tx, as(), { name: "General" }))).id;
  building = (await run((tx) =>
    writeFund(tx, as(), { name: "Building", restricted: true }),
  )).id;

  ann = await person("Ann");
  bob = await person("Bob");
  carl = await person("Carl");

  // R13.18. Ann and Bob are one household; Carl is on his own.
  const home = await run((tx) => createHousehold(tx, as(), "The Smiths"));
  await run((tx) => addToHousehold(tx, as(), home.id, ann, "head"));
  await run((tx) => addToHousehold(tx, as(), home.id, bob, "spouse"));

  await gift(ann, general, 30_000, "2031-02-01");
  await gift(bob, general, 10_000, "2031-03-01");
  await gift(carl, building, 5_000, "2031-04-01");
  await run((tx) =>
    recordGift(tx, as(), {
      memberId: carl, fundId: general, amountCents: 0, method: "in_kind",
      inKindDescription: "A piano", receivedOn: "2031-05-01",
    }),
  );
});

afterAll(async () => {
  await dropTenants(SLUG);
  await closeConnections();
});

describe("a statement", () => {
  it("totals the cash and leaves a gift in kind out of it", async () => {
    const one = await run((tx) => statementFor(tx, as(), carl, "2031"))!;
    expect(one!.totalCents).toBe(5_000);
    expect(one!.lines).toHaveLength(2);
    expect(one!.lines.some((line) => line.inKindDescription === "A piano")).toBe(true);
  });

  it("carries the acknowledgment line only where a single gift reached $250", async () => {
    expect((await run((tx) => statementFor(tx, as(), ann, "2031")))!.needsAcknowledgment)
      .toBe(true);
    expect((await run((tx) => statementFor(tx, as(), carl, "2031")))!.needsAcknowledgment)
      .toBe(false);
  });

  it("writes one a person by default", async () => {
    const givers = await run((tx) => statementGivers(tx, as(), "2031"));
    expect(givers.map((one) => one.name).sort()).toEqual([
      "Ann Statementstest", "Bob Statementstest", "Carl Statementstest",
    ]);
  });

  it("R13.18. folds a household into one, where the church chooses that", async () => {
    await run((tx) => setStatementsBy(tx, as(), "household"));

    const givers = await run((tx) => statementGivers(tx, as(), "2031", "household"));
    expect(givers).toHaveLength(2);

    /*
     * R13.18. "The Smiths" on its own reads as a letter to one person, so the
     * statement is headed "The Smiths Household". A church that already wrote
     * the word into the name keeps what it wrote.
     */
    const home = givers.find((one) => one.name === "The Smiths Household")!;
    expect(home.totalCents).toBe(40_000);

    const sheet = await run((tx) => statementFor(tx, as(), ann, "2031", "household"));
    expect(sheet!.name).toBe("The Smiths Household");
    expect(sheet!.totalCents).toBe(40_000);

    // Carl has no household, so he stands on his own either way.
    const alone = await run((tx) => statementFor(tx, as(), carl, "2031", "household"));
    expect(alone!.totalCents).toBe(5_000);
  });

  it("is refused to somebody who cannot see giving amounts", async () => {
    await expect(run((tx) => statementGivers(tx, as("staff"), "2031"), "staff"))
      .rejects.toBeInstanceOf(PermissionError);
  });
});

describe("a campaign", () => {
  let campaign: string;

  it("counts what came in to its fund inside its period", async () => {
    campaign = (await run((tx) =>
      writeCampaign(tx, as(), {
        name: "The roof",
        fundId: building,
        targetCents: 20_000,
        startsOn: "2031-01-01",
        endsOn: "2031-12-31",
      }),
    )).id;

    const [one] = await run((tx) => listCampaigns(tx));
    expect(one!.receivedCents).toBe(5_000);
    expect(one!.targetCents).toBe(20_000);
    // The general fund's gifts are not this campaign's.
    expect(one!.pledgedCents).toBe(0);
  });

  it("R13.18. reads a commitment against what the household has given", async () => {
    await run((tx) =>
      writePledge(tx, as(), { campaignId: campaign, memberId: ann, amountCents: 10_000 }),
    );

    // Bob gives to the building fund. Ann pledged, Bob paid, the pledge is kept.
    await gift(bob, building, 10_000, "2031-06-01");

    const [pledge] = await run((tx) => listPledges(tx, as(), campaign));
    expect(pledge!.amountCents).toBe(10_000);
    expect(pledge!.givenCents).toBe(10_000);
  });

  it("writes a commitment once a person, correcting it rather than doubling it", async () => {
    await run((tx) =>
      writePledge(tx, as(), { campaignId: campaign, memberId: ann, amountCents: 15_000 }),
    );
    const pledges = await run((tx) => listPledges(tx, as(), campaign));
    expect(pledges).toHaveLength(1);
    expect(pledges[0]!.amountCents).toBe(15_000);
  });

  it("closes, and comes off the live list", async () => {
    await run((tx) => setCampaignArchived(tx, as(), campaign, true));
    expect(await run((tx) => listCampaigns(tx))).toHaveLength(0);
    expect(await run((tx) => listCampaigns(tx, { includeArchived: true }))).toHaveLength(1);
  });

  it("is refused to somebody who does not run the giving", async () => {
    await expect(
      run((tx) =>
        writeCampaign(tx, as("staff"), {
          name: "Nope", fundId: general, targetCents: 100, startsOn: "2031-01-01",
        }),
        "staff",
      ),
    ).rejects.toBeInstanceOf(PermissionError);
  });
});

/*
 * HRT-345. Every statement a church is printing, read together.
 *
 * Reading them one at a time cost three round trips a giver, so four hundred
 * givers never reached the printer. The batch groups the gifts in memory, which
 * is exactly where one giver's gifts could land on another's sheet, so that is
 * what these check. The totals are read from the gifts table rather than
 * written down here, because the campaign tests above give to this same church
 * and a hardcoded figure would only be testing the order the file runs in.
 */
describe("reading every statement at once", () => {
  /** What this person's own cash came to in the year, straight from the rows. */
  const cashOf = async (memberId: string): Promise<number> => {
    const [row] = await owner()<{ total: number }[]>`
      select coalesce(sum(g.amount_cents - g.refunded_cents), 0)::int as total
        from gifts g
       where g.tenant_id = ${tenant} and g.member_id = ${memberId}
         and g.in_kind_description is null
         and g.received_on between '2031-01-01' and '2031-12-31'
         and coalesce(g.status, 'settled') = 'settled'`;
    return row!.total;
  };

  it("gives each giver their own gifts and nobody else's", async () => {
    const sheets = await run((tx) => statementsFor(tx, as(), [ann, bob, carl], "2031"));
    expect(sheets).toHaveLength(3);

    for (const [i, memberId] of [ann, bob, carl].entries()) {
      expect(sheets[i]!.memberId).toBe(memberId);
      expect(sheets[i]!.totalCents).toBe(await cashOf(memberId));
    }

    /* The failure this guards: a giver's lines appearing on somebody else's
       sheet. In person mode the three sets share nothing. */
    const key = (one: { date: string; fund: string; amountCents: number }) =>
      `${one.date}|${one.fund}|${one.amountCents}`;
    const annLines = new Set(sheets[0]!.lines.map(key));
    for (const line of sheets[2]!.lines) expect(annLines.has(key(line))).toBe(false);
  });

  it("returns them in the order it was given, and leaves out a stranger", async () => {
    const sheets = await run((tx) =>
      statementsFor(tx, as(), [carl, ann, "00000000-0000-0000-0000-000000000000"], "2031"),
    );

    expect(sheets.map((one) => one.memberId)).toEqual([carl, ann]);
  });

  /* R13.18. The household's gifts on one sheet, under the household's own
     name, and the person outside it untouched by them. */
  it("folds a household, and agrees with the single-statement wrapper", async () => {
    const [together] = await run((tx) => statementsFor(tx, as(), [ann], "2031", "household"));
    const alone = await run((tx) => statementFor(tx, as(), ann, "2031", "household"));

    expect(together!.name).toContain("Smiths");
    expect(together!.totalCents).toBe((await cashOf(ann)) + (await cashOf(bob)));
    /* The member's own statement screen still goes through the wrapper, so the
       two must never disagree. */
    expect(together).toEqual(alone);

    const [onHisOwn] = await run((tx) => statementsFor(tx, as(), [carl], "2031", "household"));
    expect(onHisOwn!.totalCents).toBe(await cashOf(carl));
  });

  it("asks for nothing when there is nobody to print for", async () => {
    expect(await run((tx) => statementsFor(tx, as(), [], "2031"))).toEqual([]);
  });

  it("puts the lines in date order across a whole household", async () => {
    const [sheet] = await run((tx) => statementsFor(tx, as(), [ann], "2031", "household"));
    const dates = sheet!.lines.map((one) => one.date);

    expect(dates.length).toBeGreaterThan(1);
    expect(dates).toEqual([...dates].sort());
  });
});

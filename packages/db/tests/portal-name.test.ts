/**
 * R1.1, R17.1. The address a congregation types.
 *
 * Members sign in at `<name>.connectapp.church`. The church picks the name and
 * we own the domain, so the only thing that can go wrong is two churches
 * wanting the same name, or one church taking a name that is already another
 * church's address.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { withTenant, owner, closeConnections, type Tx } from "../src/client";
import {
  slugUnderPlatform, cleanPortalName, portalNameFree, setPortalName,
  setPortalOpen, resolveTenantByHost,
} from "../src/repo/domains";
import { PermissionError, type TenantRole } from "../src/roles";
import { InvalidInputError, NameTakenError } from "../src/errors";
import { testTenant, dropTenants } from "./helpers/tenant";

let one: string;
let two: string;

const as = (tenantId: string, role: TenantRole = "owner") => ({ tenantId, role });
const run = <T>(tenantId: string, work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId, role }, work);

beforeAll(async () => {
  one = await testTenant("portalone", "Portal One Church");
  two = await testTenant("portaltwo", "Portal Two Church");
});

afterAll(async () => {
  await dropTenants("portalone");
  await dropTenants("portaltwo");
  await closeConnections();
});

describe("a name under our own host", () => {
  it("reads the church out of the address", () => {
    expect(slugUnderPlatform("riverside.connectapp.church")).toBe("riverside");
    expect(slugUnderPlatform("ONEFAMILY.connectapp.church")).toBe("onefamily");
    // Somebody working on it locally.
    expect(slugUnderPlatform("riverside.localhost:4488")).toBe("riverside");
  });

  it("is not our own front door, and not a name two deep", () => {
    expect(slugUnderPlatform("connectapp.church")).toBeNull();
    expect(slugUnderPlatform("www.connectapp.church")).toBeNull();
    expect(slugUnderPlatform("api.connectapp.church")).toBeNull();
    expect(slugUnderPlatform("a.b.connectapp.church")).toBeNull();
  });

  it("is not somebody else's domain", () => {
    expect(slugUnderPlatform("members.gracechurch.org")).toBeNull();
    expect(slugUnderPlatform("gracechurch.org")).toBeNull();
  });
});

describe("what a church may call it", () => {
  it("takes letters, numbers and hyphens", () => {
    expect(cleanPortalName("OneFamily")).toBe("onefamily");
    expect(cleanPortalName("  grace-community  ")).toBe("grace-community");
    expect(cleanPortalName("st1")).toBe("st1");
  });

  it("refuses what a congregation could not type or say", () => {
    for (const bad of ["ab", "", "   ", "one family", "one_family", "-grace", "grace-",
                       "grace.church", "GRACE!", "a".repeat(41)]) {
      expect(cleanPortalName(bad)).toBeNull();
    }
  });

  /*
   * R17.1. The list is only what a church may not choose. We go on using any
   * of these ourselves: it stops a church looking like the company, or like
   * our own giving page, or answering for our mail.
   */
  it("refuses the names that are the platform", () => {
    for (const taken of [
      "connectapp", "www", "api", "admin", "mail", "status",
      // A mail client looking for these under our own domain.
      "autodiscover", "mx", "ns1", "dmarc",
      // Where the product is worked on.
      "test", "example", "demo", "staging",
      // Anything that would read as the company speaking.
      "support", "security", "billing", "official",
      // And the one somebody could collect money under our name with.
      "give", "giving", "donate", "tithe",
    ]) {
      expect(cleanPortalName(taken)).toBeNull();
    }
  });

  it("still takes a name that only contains one of them", () => {
    expect(cleanPortalName("givechurch")).toBe("givechurch");
    expect(cleanPortalName("thewell")).toBe("thewell");
    expect(cleanPortalName("apple-valley")).toBe("apple-valley");
  });
});

describe("taking a name", () => {
  it("is free until somebody has it", async () => {
    expect(await portalNameFree("onefamily", one)).toBe(true);

    await run(one, (tx) => setPortalName(tx, as(one), { name: "onefamily" }));
    expect(await portalNameFree("onefamily", two)).toBe(false);

    // Still free for the church that holds it, so it can be saved again.
    expect(await portalNameFree("onefamily", one)).toBe(true);
  });

  it("refuses a second church the same name", async () => {
    await expect(
      run(two, (tx) => setPortalName(tx, as(two), { name: "onefamily" })),
    ).rejects.toBeInstanceOf(NameTakenError);
  });

  /* The address a church already answers at is its slug, so a name that
     shadowed another church's slug would take that church's address away. */
  it("refuses a name that is another church's own address", async () => {
    expect(await portalNameFree("portaltwo", one)).toBe(false);
    await expect(
      run(one, (tx) => setPortalName(tx, as(one), { name: "portaltwo" })),
    ).rejects.toBeInstanceOf(NameTakenError);
  });

  it("refuses a shape nobody could type", async () => {
    await expect(
      run(one, (tx) => setPortalName(tx, as(one), { name: "one family" })),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("is given up by clearing it", async () => {
    await run(one, (tx) => setPortalName(tx, as(one), { name: null }));
    expect(await portalNameFree("onefamily", two)).toBe(true);
  });

  it("cannot be set by a role that cannot manage the church", async () => {
    await expect(
      run(one, (tx) => setPortalName(tx, as(one, "staff"), { name: "onefamily" }), "staff"),
    ).rejects.toBeInstanceOf(PermissionError);
  });
});

/*
 * R17.1. A church that has turned its address off is not reachable at it.
 * Staff work at the main address either way, so this takes nothing away from
 * running the week.
 */
describe("turning the address off", () => {
  it("stops the host naming the church, and turning it on brings it back", async () => {
    await run(one, (tx) => setPortalName(tx, as(one), { name: "portalswitch" }));
    expect(await resolveTenantByHost("portalswitch.connectapp.church")).not.toBeNull();

    await run(one, (tx) => setPortalOpen(tx, as(one), false));
    expect(await resolveTenantByHost("portalswitch.connectapp.church")).toBeNull();
    // And not by its slug either, since that is the same address.
    expect(await resolveTenantByHost("portalone.connectapp.church")).toBeNull();

    await run(one, (tx) => setPortalOpen(tx, as(one), true));
    expect(await resolveTenantByHost("portalswitch.connectapp.church")).not.toBeNull();
  });

  it("cannot be turned off by a role that cannot manage the church", async () => {
    await expect(
      run(one, (tx) => setPortalOpen(tx, as(one, "staff"), false), "staff"),
    ).rejects.toBeInstanceOf(PermissionError);
  });
});

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
  slugUnderPlatform, cleanPortalName, isReservedName, portalNameFree, setPortalName,
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
  /* Named here rather than read from the environment, so the rule is what is
     being tested and not whichever host this machine is set up for. */
  const OURS = "connectapp.church";

  it("reads the church out of the address", () => {
    expect(slugUnderPlatform("riverside.connectapp.church", OURS)).toBe("riverside");
    expect(slugUnderPlatform("ONEFAMILY.connectapp.church", OURS)).toBe("onefamily");
    // Somebody working on it locally.
    expect(slugUnderPlatform("riverside.localhost:4488", OURS)).toBe("riverside");
  });

  it("is not our own front door, and not a name two deep", () => {
    expect(slugUnderPlatform("connectapp.church", OURS)).toBeNull();
    expect(slugUnderPlatform("www.connectapp.church", OURS)).toBeNull();
    expect(slugUnderPlatform("api.connectapp.church", OURS)).toBeNull();
    expect(slugUnderPlatform("a.b.connectapp.church", OURS)).toBeNull();
  });

  it("is not somebody else's domain", () => {
    expect(slugUnderPlatform("members.gracechurch.org", OURS)).toBeNull();
    expect(slugUnderPlatform("gracechurch.org", OURS)).toBeNull();
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
  it("refuses the names that are the platform", async () => {
    for (const taken of [
      "connectapp", "www", "api", "admin", "mail", "status",
      // A mail client looking for these under our own domain. The two-letter
      // ones never reach the list: three characters is the shape.
      "autodiscover", "ns1", "dmarc", "smtp",
      // Where the product is worked on.
      "test", "example", "demo", "staging",
      // Anything that would read as the company speaking.
      "support", "security", "billing", "official",
      // And the one somebody could collect money under our name with.
      "give", "giving", "donate", "tithe",
    ]) {
      // The shape is fine. It is ours, which is a different answer.
      expect(cleanPortalName(taken)).toBe(taken);
      expect(isReservedName(taken)).toBe(true);
      expect(await portalNameFree(taken, one)).toBe(false);
    }
  });

  it("refuses the short ones on their shape, before the list is reached", () => {
    expect(cleanPortalName("mx")).toBeNull();
    expect(cleanPortalName("ns")).toBeNull();
  });

  it("still takes a name that only contains one of them", () => {
    expect(isReservedName("givechurch")).toBe(false);
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

  /*
   * R17.1. Three refusals, and a church is told which. Being told the spelling
   * is wrong when the name is simply ours sends somebody back to fix a
   * spelling that was right.
   */
  it("says which of the three it is", async () => {
    const refusal = async (name: string) => {
      try {
        await run(one, (tx) => setPortalName(tx, as(one), { name }));
        return "allowed";
      } catch (reason) {
        // The message is already in the reader's language, so the key is
        // what says which refusal this is.
        return (reason as { key?: string }).key ?? "unknown";
      }
    };

    expect(await refusal("one family")).toBe("portal.error.shape");
    expect(await refusal("connectapp")).toBe("portal.error.blocked");
    expect(await refusal("portaltwo")).toBe("portal.error.taken");
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
  /* The host this deployment answers on, which is what resolveTenantByHost
     reads. Development runs under lvh.me so a cookie can span it. */
  const platform = process.env["PLATFORM_HOST"] ?? "connectapp.church";

  it("stops the host naming the church, and turning it on brings it back", async () => {
    await run(one, (tx) => setPortalName(tx, as(one), { name: "portalswitch" }));
    expect(await resolveTenantByHost(`portalswitch.${platform}`)).not.toBeNull();

    await run(one, (tx) => setPortalOpen(tx, as(one), false));
    expect(await resolveTenantByHost(`portalswitch.${platform}`)).toBeNull();
    // And not by its slug either, since that is the same address.
    expect(await resolveTenantByHost(`portalone.${platform}`)).toBeNull();

    await run(one, (tx) => setPortalOpen(tx, as(one), true));
    expect(await resolveTenantByHost(`portalswitch.${platform}`)).not.toBeNull();
  });

  it("cannot be turned off by a role that cannot manage the church", async () => {
    await expect(
      run(one, (tx) => setPortalOpen(tx, as(one, "staff"), false), "staff"),
    ).rejects.toBeInstanceOf(PermissionError);
  });
});

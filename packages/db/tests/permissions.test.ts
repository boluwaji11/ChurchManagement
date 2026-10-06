import { describe, expect, it } from "vitest";
import {
  PERMISSIONS, PERMISSION_GROUPS, ROLE_PERMISSIONS, TENANT_ROLES, can, rolesWith,
  canEditPeople, canArchivePeople, canReadConfidentialNotes, canReadGivingAmounts,
} from "../src/roles";
import { canManageHouseholds } from "../src/roles";
import { canManageChurch } from "../src/repo/church";
import { canManageRooms } from "../src/repo/rooms";
import { canManageStations } from "../src/repo/stations";
import { canCheckIn } from "../src/repo/checkin";
import { canReadIncidents, canFileIncident } from "../src/repo/incidents";
import { canSeeChecks } from "../src/repo/checks";
import { canFollowUp } from "../src/repo/followups";
import { canManageGroups } from "../src/repo/groups";
import { canManageServices } from "../src/repo/services";
import { canManageTeams, canLeadTeams } from "../src/repo/serving";
import { canManageTags } from "../src/repo/tags";
import { canManageCustomFields } from "../src/repo/custom-fields";
import { CAN_SUPERVISE } from "../src/repo/supervisor";

/**
 * R1.6. The matrix answers every authorisation question the product asks.
 *
 * The answers below are the ones the product gave before the matrix existed,
 * written out by hand rather than computed, so a change to the matrix that
 * moves a permission shows up here as a failing assertion instead of as a
 * volunteer who can suddenly archive a person.
 */
const EXPECTED: Record<string, readonly string[]> = {
  canEditPeople: ["owner", "admin", "staff"],
  canArchivePeople: ["owner", "admin"],
  canManageHouseholds: ["owner", "admin", "staff"],
  canReadConfidentialNotes: ["owner", "pastoral"],
  canReadGivingAmounts: ["owner", "finance"],
  canManageChurch: ["owner", "admin"],
  canManageCustomFields: ["owner", "admin"],
  canManageTags: ["owner", "admin"],
  canManageRooms: ["owner", "admin"],
  canManageStations: ["owner", "admin"],
  canCheckIn: ["owner", "admin", "staff", "checkin_volunteer"],
  canReadIncidents: ["owner", "admin", "pastoral"],
  canFileIncident: ["owner", "admin", "staff", "pastoral", "checkin_volunteer"],
  canSeeChecks: ["owner", "admin", "pastoral"],
  canFollowUp: ["owner", "admin", "staff", "pastoral"],
  canManageGroups: ["owner", "admin", "staff", "pastoral"],
  canManageServices: ["owner", "admin", "staff"],
  canManageTeams: ["owner", "admin", "staff"],
  canLeadTeams: ["owner", "admin", "staff", "team_leader"],
};

const CHECKS = {
  canEditPeople, canArchivePeople, canManageHouseholds, canReadConfidentialNotes, canReadGivingAmounts,
  canManageChurch, canManageCustomFields, canManageTags, canManageRooms,
  canManageStations, canCheckIn, canReadIncidents, canFileIncident, canSeeChecks,
  canFollowUp, canManageGroups, canManageServices, canManageTeams, canLeadTeams,
};

describe("the permission matrix", () => {
  for (const [name, allowed] of Object.entries(EXPECTED)) {
    it(`${name} admits exactly the roles it always did`, () => {
      const check = CHECKS[name as keyof typeof CHECKS];
      const actual = TENANT_ROLES.filter((role) => check(role));
      expect([...actual].sort()).toEqual([...allowed].sort());
    });
  }

  it("gives the owner every permission", () => {
    for (const permission of PERMISSIONS) expect(can("owner", permission)).toBe(true);
  });

  it("gives a member none", () => {
    expect(ROLE_PERMISSIONS.member).toEqual([]);
  });

  it("names a role in every grant", () => {
    for (const role of Object.keys(ROLE_PERMISSIONS)) {
      expect(TENANT_ROLES).toContain(role);
    }
  });

  it("grants only permissions that exist", () => {
    for (const held of Object.values(ROLE_PERMISSIONS)) {
      for (const permission of held) expect(PERMISSIONS).toContain(permission);
    }
  });

  it("lists roles in the order roles are declared", () => {
    expect(rolesWith("checkin.run")).toEqual(
      TENANT_ROLES.filter((role) => can(role, "checkin.run")),
    );
  });

  it("supervising a room is the same reach as running check-in", () => {
    expect([...CAN_SUPERVISE]).toEqual(["owner", "admin", "staff", "checkin_volunteer"]);
  });
});

describe("the groups the screens read", () => {
  it("names every permission exactly once", () => {
    const listed = PERMISSION_GROUPS.flatMap((group) => group.permissions);
    expect([...listed].sort()).toEqual([...PERMISSIONS].sort());
    expect(new Set(listed).size).toBe(listed.length);
  });
});

describe("a role a church wrote itself", () => {
  /*
   * R1.6. Somebody on a custom role carries role "member" in the enum column
   * and their real set beside it, so every guard has to read the whole actor.
   * These assert the shape the repositories rely on.
   */
  const custom = { role: "member" as const, permissions: ["members.edit", "checkin.run"] as const };

  it("grants what the church gave it", () => {
    expect(can(custom, "members.edit")).toBe(true);
    expect(can(custom, "checkin.run")).toBe(true);
  });

  it("grants nothing else", () => {
    expect(can(custom, "members.archive")).toBe(false);
    expect(can(custom, "church.manage")).toBe(false);
    expect(can(custom, "giving.amounts")).toBe(false);
  });

  it("falls back to the matrix when the role carries no set of its own", () => {
    expect(can({ role: "staff", permissions: null }, "members.edit")).toBe(true);
    expect(can({ role: "member", permissions: null }, "members.edit")).toBe(false);
  });
});

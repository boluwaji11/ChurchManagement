/**
 * HRT-202, R1.3, R24.6. One sidebar per persona.
 *
 * The sidebar is the clearest statement the product makes about what somebody
 * is for. A check-in volunteer who opens the app onto a directory of four
 * hundred households has been told, wrongly, that the directory is their job.
 *
 * Every role's list is written out here in full. A permission added to a role
 * then fails this test rather than quietly widening somebody's reach, and the
 * failure names which row appeared and for whom, which is the question anybody
 * reviewing it would ask next.
 */
import { describe, it, expect } from "vitest";
// Reached by path: this package does not depend on the db package, and the
// test needs the role list itself rather than a copy that can drift.
import { TENANT_ROLES, type TenantRole } from "../../db/src/permissions";
import { navFor } from "../../../apps/web/components/shell/nav";

const sidebar = (role: TenantRole): string[] =>
  navFor({ role } as never).map((one) => one.href);

/**
 * What each built-in role opens the product onto, in order.
 *
 * Read it as a sentence about the person. A treasurer's product is giving. A
 * check-in volunteer's product is the desk on a service day.
 */
const EXPECTED: Record<TenantRole, string[]> = {
  owner: [
    "/dashboard", "/members", "/messages", "/followups", "/checkin",
    "/calendar", "/services", "/schedule", "/groups", "/events", "/giving",
    "/forms", "/website", "/reports", "/settings/church",
  ],
  admin: [
    "/dashboard", "/members", "/messages", "/followups", "/checkin",
    "/calendar", "/services", "/schedule", "/groups", "/events",
    "/forms", "/website", "/reports", "/settings/church",
  ],
  staff: [
    "/dashboard", "/members", "/messages", "/followups", "/checkin",
    "/calendar", "/services", "/schedule", "/groups", "/events",
    "/reports", "/settings/profile",
  ],
  // A treasurer opens the product for one thing.
  finance: ["/home", "/giving", "/directory", "/groups", "/settings/profile"],
  // No check-in desk, no services, no events. The notes and the people.
  pastoral: [
    "/dashboard", "/members", "/messages", "/followups", "/groups",
    "/reports", "/settings/profile",
  ],
  group_leader: ["/home", "/groups", "/directory", "/settings/profile"],
  team_leader: ["/home", "/schedule", "/directory", "/groups", "/settings/profile"],
  checkin_volunteer: ["/home", "/checkin", "/directory", "/groups", "/settings/profile"],
  member: ["/home", "/groups", "/directory", "/settings/profile"],
};

describe("the sidebar", () => {
  for (const role of TENANT_ROLES) {
    it(`is the same list every time for ${role}`, () => {
      expect(sidebar(role)).toEqual(EXPECTED[role]);
    });
  }

  it("covers every built-in role, so a new one cannot arrive unwritten", () => {
    expect(Object.keys(EXPECTED).sort()).toEqual([...TENANT_ROLES].sort());
  });

  /*
   * R1.3. The one row everybody has. Somebody who can reach no screen at all
   * opens the product onto a blank frame and reads it as broken.
   */
  it("never leaves anybody with nothing to open", () => {
    for (const role of TENANT_ROLES) {
      expect(sidebar(role).length).toBeGreaterThan(0);
    }
  });

  /*
   * R3.1. Two directories, and nobody gets both. Staff work the church's
   * records; everybody else sees what the church chose to publish.
   */
  it("gives nobody both directories", () => {
    for (const role of TENANT_ROLES) {
      const hrefs = sidebar(role);
      expect(hrefs.includes("/members") && hrefs.includes("/directory")).toBe(false);
    }
  });

  /* R1.5. The amounts are a role, and the sidebar must not advertise them. */
  it("offers giving only to the roles that may read it", () => {
    for (const role of TENANT_ROLES) {
      if (sidebar(role).includes("/giving")) {
        expect(["owner", "finance"]).toContain(role);
      }
    }
  });
});

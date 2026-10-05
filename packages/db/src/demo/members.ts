/**
 * R19.7. The demo church.
 *
 * Realistic rather than tidy, because a church looking at a product needs to
 * see what their own list will look like: a household with a missing phone
 * number, a visitor nobody has followed up, a widower on his own, a student who
 * comes home in the summer. A demo of perfect records teaches nothing.
 *
 * American names and a Texas area code, since this ships in the US first.
 */

export interface DemoPerson {
  firstName: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth?: string;
  status: "visitor" | "regular_attender" | "member" | "inactive";
  membershipDate?: string;
  firstVisitOn?: string;
  email?: string;
  phone?: string;
  household?: string;
  householdRole?: "head" | "spouse" | "child" | "other";
  tags?: string[];
  milestones?: { kind: string; on: string }[];
  /** Related members, by "FirstName LastName". Inverses are written for us. */
  relationships?: { to: string; kind: string }[];
}

export const DEMO_TAGS: { name: string; hue: string }[] = [
  { name: "Choir", hue: "violet" },
  { name: "Greeter", hue: "amber" },
  { name: "Needs a ride", hue: "rose" },
  { name: "Nursery volunteer", hue: "teal" },
  { name: "Small group leader", hue: "fern" },
];

export const DEMO_PEOPLE: DemoPerson[] = [
  { firstName: "Daniel", lastName: "Harrison", dateOfBirth: "1979-03-14", status: "member",
    membershipDate: "2011-09-04", email: "daniel.harrison@example.org", phone: "(512) 555 0142",
    household: "Harrison", householdRole: "head", tags: ["Small group leader"],
    milestones: [{ kind: "baptism", on: "2011-06-12" }, { kind: "membership_class", on: "2011-08-21" }] },
  { firstName: "Rebecca", lastName: "Harrison", dateOfBirth: "1981-07-02", status: "member",
    membershipDate: "2011-09-04", email: "rebecca.harrison@example.org", phone: "(512) 555 0143",
    household: "Harrison", householdRole: "spouse", tags: ["Choir"],
    relationships: [{ to: "Daniel Harrison", kind: "spouse" }] },
  { firstName: "Caleb", lastName: "Harrison", dateOfBirth: "2012-11-08", status: "member",
    household: "Harrison", householdRole: "child",
    milestones: [{ kind: "child_dedication", on: "2013-03-10" }],
    relationships: [{ to: "Daniel Harrison", kind: "parent" }, { to: "Rebecca Harrison", kind: "parent" }] },
  { firstName: "Hannah", lastName: "Harrison", dateOfBirth: "2015-02-19", status: "member",
    household: "Harrison", householdRole: "child",
    relationships: [{ to: "Daniel Harrison", kind: "parent" }, { to: "Rebecca Harrison", kind: "parent" }] },
  { firstName: "Micah", lastName: "Harrison", dateOfBirth: "2019-06-30", status: "member",
    household: "Harrison", householdRole: "child",
    relationships: [{ to: "Rebecca Harrison", kind: "parent" }] },

  { firstName: "Angela", lastName: "Whitfield", dateOfBirth: "1986-01-25", status: "member",
    membershipDate: "2018-02-11", email: "angela.whitfield@example.org", phone: "(512) 555 0188",
    household: "Whitfield", householdRole: "head", tags: ["Nursery volunteer"] },
  { firstName: "Jonah", lastName: "Whitfield", dateOfBirth: "2014-09-12", status: "member",
    household: "Whitfield", householdRole: "child",
    relationships: [{ to: "Angela Whitfield", kind: "parent" }] },
  { firstName: "Dorothy", lastName: "Whitfield", preferredName: "Dot", dateOfBirth: "1944-05-03",
    status: "member", membershipDate: "1998-04-05", phone: "(512) 555 0190",
    household: "Whitfield (Dorothy)", householdRole: "head", tags: ["Needs a ride"],
    relationships: [{ to: "Angela Whitfield", kind: "child" }] },

  { firstName: "Marcus", lastName: "Flores", dateOfBirth: "1990-10-17", status: "member",
    membershipDate: "2025-03-16", email: "marcus.flores@example.org", phone: "(512) 555 0211",
    household: "Flores", householdRole: "head", tags: ["Greeter"],
    milestones: [{ kind: "baptism", on: "2025-02-09" }] },
  { firstName: "Priya", lastName: "Flores", dateOfBirth: "1992-04-08", status: "member",
    membershipDate: "2025-03-16", email: "priya.flores@example.org",
    household: "Flores", householdRole: "spouse", tags: ["Greeter"],
    relationships: [{ to: "Marcus Flores", kind: "spouse" }] },

  { firstName: "Thomas", lastName: "Brennan", dateOfBirth: "1968-12-01", status: "regular_attender",
    firstVisitOn: "2022-01-09", email: "tbrennan@example.org", phone: "(512) 555 0164",
    household: "Brennan", householdRole: "head" },
  { firstName: "Susan", lastName: "Brennan", dateOfBirth: "1970-08-23", status: "regular_attender",
    firstVisitOn: "2022-01-09", household: "Brennan", householdRole: "spouse", tags: ["Choir"],
    relationships: [{ to: "Thomas Brennan", kind: "spouse" }] },

  { firstName: "Elena", lastName: "Reyes", dateOfBirth: "1977-06-15", status: "member",
    membershipDate: "2009-10-11", email: "elena.reyes@example.org", phone: "(512) 555 0175",
    household: "Reyes", householdRole: "head" },
  { firstName: "Olivia", lastName: "Reyes", dateOfBirth: "2005-03-27", status: "member",
    membershipDate: "2021-05-23", email: "olivia.reyes@example.org",
    household: "Reyes", householdRole: "child", tags: ["Choir"],
    milestones: [{ kind: "confirmation", on: "2021-05-23" }],
    relationships: [{ to: "Elena Reyes", kind: "parent" }] },

  { firstName: "Nathan", lastName: "Pruitt", status: "visitor", firstVisitOn: "2026-09-13",
    email: "nathan.pruitt@example.org" },
  { firstName: "Kayla", lastName: "Osborne", status: "visitor", firstVisitOn: "2026-09-20",
    phone: "(512) 555 0233" },
  { firstName: "Gregory", lastName: "Tanaka", status: "visitor", firstVisitOn: "2026-09-27",
    email: "greg.tanaka@example.org", phone: "(512) 555 0247" },

  { firstName: "Vincent", lastName: "Doyle", dateOfBirth: "1983-02-11", status: "inactive",
    membershipDate: "2016-06-05", email: "vdoyle@example.org" },
  { firstName: "Charlotte", lastName: "Mercer", dateOfBirth: "1958-09-09", status: "inactive",
    membershipDate: "2004-01-18", phone: "(512) 555 0119" },

  { firstName: "Raymond", lastName: "Kessler", dateOfBirth: "1949-11-22", status: "member",
    membershipDate: "1995-03-12", phone: "(512) 555 0126", household: "Kessler",
    householdRole: "head", tags: ["Needs a ride"] },
  { firstName: "Joan", lastName: "Kessler", dateOfBirth: "1951-04-30", status: "inactive",
    membershipDate: "1995-03-12", household: "Kessler", householdRole: "spouse",
    milestones: [{ kind: "death", on: "2025-11-04" }],
    relationships: [{ to: "Raymond Kessler", kind: "spouse" }] },
];

import type { SetupStep } from "@connectapp/db";

/** Where each setup step is actually done. The wizard sends members to the product. */
export const SETUP_LINKS: Record<SetupStep, string> = {
  church: "/settings/church",
  services: "/services",
  // The directory rather than the importer: a church with forty people may
  // well rather type them than build a spreadsheet first, and both buttons are
  // on this screen.
  members: "/members",
  team: "/settings/manage-accesses",
  rooms: "/settings/rooms",
};

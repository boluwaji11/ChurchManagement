import type { SetupStep } from "@hearth/db";

/** Where each setup step is actually done. The wizard sends members to the product. */
export const SETUP_LINKS: Record<SetupStep, string> = {
  church: "/settings/church",
  services: "/services",
  members: "/import",
  team: "/settings/team",
  rooms: "/settings/rooms",
};

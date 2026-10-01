import type { SetupStep } from "@hearth/db";

/** Where each setup step is actually done. The wizard sends people to the product. */
export const SETUP_LINKS: Record<SetupStep, string> = {
  church: "/settings/church",
  services: "/services",
  people: "/import",
  team: "/settings/team",
  rooms: "/settings/rooms",
};

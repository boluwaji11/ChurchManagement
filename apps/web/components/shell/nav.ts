import type { LucideIcon } from "lucide-react";
import {
  Users, UserPlus, Baby, DoorOpen, ListMusic, HandHeart, CircleDot,
  ClipboardList, ShieldAlert, Settings, Home,
} from "lucide-react";
import {
  canCheckIn, canEditPeople, canFollowUp, canManageServices, canReadIncidents,
  canLeadTeams, canManageChurch, type TenantRole,
} from "@hearth/db";
import { t } from "@hearth/i18n";
import type { NavTarget } from "./nav-active";

/**
 * R24.6. What goes down the side of the app.
 *
 * One list, read by the sidebar on a desktop and by the tab bar on a phone, so
 * the two can never drift. The order is the order a church works in rather than
 * the order the features were built.
 *
 * HRT-202 scopes this per role properly, giving a pastor and a group leader
 * their own list. This holds the entries the roles already reach today.
 */
export interface NavEntry extends NavTarget {
  /** Resolved by this module, so the sidebar stays a plain list of strings. */
  label: string;
  icon: LucideIcon;
}

export function navFor(role: TenantRole): NavEntry[] {
  const staff = canEditPeople(role) || canReadIncidents(role);
  const out: NavEntry[] = [];

  // R3.1. One directory each. Staff work in the church's records; a member sees
  // what the rest of the church chose to publish.
  if (staff) {
    out.push({
      label: t("nav.directory"),
      href: "/people",
      icon: Users,
      owns: ["/people", "/duplicates", "/import", "/fields", "/tags"],
    });
  } else {
    out.push({ label: t("nav.directory"), href: "/directory", icon: Users });
  }

  // R5.5. The Monday morning screen, for the roles that work it.
  if (canFollowUp(role)) {
    out.push({ label: t("nav.followups"), href: "/followups", icon: UserPlus });
  }

  // R8.x. The screens for whoever is on the door while a service runs.
  if (canCheckIn(role)) {
    out.push({
      label: t("nav.checkin"),
      href: "/checkin",
      icon: Baby,
      owns: ["/checkin"],
    });
    out.push({ label: t("nav.rooms"), href: "/checkin/rooms", icon: DoorOpen });
  }

  // R7.x. Attendance is recorded by the church, not by the congregation.
  if (canManageServices(role)) {
    out.push({ label: t("nav.services"), href: "/services", icon: ListMusic });
  }

  // R10.1. The rota. A team leader has this and nothing else.
  if (canLeadTeams(role)) {
    out.push({ label: t("nav.serving"), href: "/serving", icon: HandHeart });
  }

  // R9.5. Groups are for everybody: finding one is the member's question.
  out.push({ label: t("nav.groups"), href: "/groups", icon: CircleDot });

  // R4.1. A form is a question the church is seen to be asking in public, so
  // Owner and Admin build them.
  if (canManageChurch(role)) {
    out.push({ label: t("form.title"), href: "/forms", icon: ClipboardList });
  }

  // R8.13. Only the roles that handle safeguarding have anywhere to go.
  if (canReadIncidents(role)) {
    out.push({ label: t("nav.incidents"), href: "/incidents", icon: ShieldAlert });
  }

  out.push({ label: t("nav.settings"), href: "/settings", icon: Settings });

  /*
   * R3.1. Somebody who is not staff has one screen. Without this they would
   * open the app onto a directory and a groups list with no way back to the
   * thing that was actually theirs.
   */
  if (!staff && !canCheckIn(role) && !canFollowUp(role) && !canLeadTeams(role)) {
    out.unshift({ label: t("nav.home"), href: "/home", icon: Home });
  }

  return out;
}

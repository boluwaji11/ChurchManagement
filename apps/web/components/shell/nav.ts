import type { LucideIcon } from "lucide-react";
import {
  Users, UserPlus, Baby, Calendar, CalendarHeart, ListMusic, HandHeart, CircleDot,
  ClipboardList, Settings, Home, LayoutDashboard, ChartNoAxesColumn,
} from "lucide-react";
import {
  canCheckIn, canEditPeople, canFollowUp, canManageServices, canReadIncidents,
  canLeadTeams, canManageChurch, canManageEvents, type TenantRole,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import type { NavTarget } from "./nav-active";

/**
 * R24.6. What goes down the side of the app.
 *
 * One list, read by the sidebar on a desktop and by the tab bar on a phone, so
 * the two can never drift.
 *
 * The order is the design's: People, Follow-ups, Check-in, Calendar, Services,
 * Serving, Groups, Events, Forms, Settings. Dashboard joins it at the top in HRT-203.
 * The design's Giving, Songs, Reports and Churches entries are the deferred
 * ones and are named in docs/redesign/README.md.
 *
 * HRT-202 gives a pastor and a group leader their own list.
 */
export interface NavEntry extends NavTarget {
  /** Resolved by this module, so the sidebar stays a plain list of strings. */
  label: string;
  icon: LucideIcon;
}

export function navFor(role: TenantRole): NavEntry[] {
  const staff = canEditPeople(role) || canReadIncidents(role);
  const out: NavEntry[] = [];

  /*
   * R3.1. Somebody who is not staff has one screen, and it is the one that is
   * theirs. Without this they would open the app onto a groups list.
   */
  /*
   * R17.1. A member's screens are not in here. They wear the portal's own
   * frame, which is a row of tabs across the top rather than this list, and
   * the two would have drifted the moment one of them changed.
   */
  const member = !staff && !canCheckIn(role) && !canFollowUp(role) && !canLeadTeams(role);
  if (member) {
    out.push({ label: t("nav.home"), href: "/home", icon: Home });
  }

  /*
   * R18.1. The screen staff open the week on, first in the list because it is
   * the one that says what needs doing before anybody has gone looking.
   */
  if (staff) {
    out.push({ label: t("dashboard.title"), href: "/dashboard", icon: LayoutDashboard });
  }

  // R3.1. One directory each. Staff work in the church's records; a member sees
  // what the rest of the church chose to publish.
  out.push(
    staff
      ? {
          label: t("nav.directory"),
          href: "/members",
          icon: Users,
          owns: ["/members", "/duplicates", "/import", "/fields", "/tags"],
        }
      : { label: t("nav.directory"), href: "/directory", icon: Users },
  );

  // R5.5. The Monday morning screen, for the roles that work it.
  if (canFollowUp(role)) {
    out.push({ label: t("nav.followups"), href: "/followups", icon: UserPlus });
  }

  /*
   * R8.x. One entry for check-in, which is what the design has. The rooms
   * board, the labels and the incident log are reached from the check-in
   * screen rather than taking three rows of their own.
   */
  if (canCheckIn(role)) {
    out.push({
      label: t("nav.checkin"),
      href: "/checkin",
      icon: Baby,
      owns: ["/checkin", "/incidents"],
    });
  }

  // R15.1. Everything the church has on, in one week.
  if (canManageServices(role)) {
    out.push({ label: t("nav.calendar"), href: "/calendar", icon: Calendar });
  }

  // R7.x. Attendance is recorded by the church, not by the congregation.
  if (canManageServices(role)) {
    out.push({ label: t("nav.services"), href: "/services", icon: ListMusic });
  }

  // R10.1. The schedule. A team leader has this and nothing else.
  if (canLeadTeams(role)) {
    out.push({ label: t("nav.serving"), href: "/schedule", icon: HandHeart });
  }


  // R9.5. Groups are for everybody: finding one is the member's question.
  out.push({ label: t("nav.groups"), href: "/groups", icon: CircleDot });

  // R14.1. What the church is putting on, and who has a place at it.
  if (canManageEvents(role)) {
    out.push({ label: t("nav.events"), href: "/events", icon: CalendarHeart });
  }

  // R4.1. A form is a question the church is seen to be asking in public, so
  // Owner and Admin build them.
  if (canManageChurch(role)) {
    out.push({ label: t("form.title"), href: "/forms", icon: ClipboardList });
  }

  /*
   * R18.2. Reports sit at the bottom beside Settings. They are read when a
   * church goes looking for a number, which is not the same errand as the work
   * the rows above it carry.
   */
  if (staff) {
    out.push({ label: t("reports.title"), href: "/reports", icon: ChartNoAxesColumn });
  }

  /*
   * Settings has no landing page of its own: the menu is already on the screen,
   * so the entry goes straight to the first section this role can change rather
   * than through a page that only redirects.
   */
  out.push({
    label: t("nav.settings"),
    href: canManageChurch(role) ? "/settings/church" : "/settings/profile",
    owns: ["/settings", "/setup"],
    icon: Settings,
  });

  return out;
}

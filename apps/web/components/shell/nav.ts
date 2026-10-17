import type { LucideIcon } from "lucide-react";
import {
  Users, UserPlus, Baby, Calendar, CalendarHeart, ListMusic, HandHeart, CircleDot,
  ClipboardList, Settings, Home, LayoutDashboard, ChartNoAxesColumn, HandCoins, Globe,
  MessageSquare,
} from "lucide-react";
import {
  can, canAnswerMessages, canCheckIn, canEditPeople, canFollowUp, canManageServices,
  canReadIncidents,
  canLeadTeams, canManageChurch, canManageEvents, canManageGiving,
  canReadGivingAmounts, type Who,
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

/**
 * R1.6. Takes whoever is asking rather than their role's name, so somebody on a
 * role their church wrote gets the screens that role was given.
 */
/**
 * HRT-202. What each volunteer persona came for, widest first.
 *
 * The first match is the row that moves up under their own screen. A team
 * leader who also helps at check-in gets the desk, because the desk is the one
 * with a queue in front of it, and a treasurer gets giving rather than the
 * groups row everybody has.
 */
const OWN_WORK = ["/checkin", "/schedule", "/giving", "/groups"] as const;

export function navFor(role: Who): NavEntry[] {
  const staff = canEditPeople(role) || canReadIncidents(role);
  const out: NavEntry[] = [];

  /*
   * R3.1, R17.1, HRT-202. Anybody who is not staff opens on their own screen,
   * volunteers included. Without this, a team leader or a check-in volunteer
   * landed on the directory, which implied the whole congregation was their
   * responsibility.
   *
   * A member's own screens are not in this list at all. The portal uses its own
   * frame, a row of tabs across the top, and keeping both in one list would
   * have let them drift apart.
   */
  if (!staff) {
    out.push({ label: t("nav.home"), href: "/home", icon: Home });
  }

  /*
   * R18.1. The screen staff start from, first in the list because it reports
   * what needs doing without anybody having to go looking for it.
   */
  if (staff) {
    out.push({ label: t("dashboard.title"), href: "/dashboard", icon: LayoutDashboard });
  }

  /*
   * R3.1. Staff work in the church's records. Everybody else reads what the
   * church chose to publish, in the portal, which has its own row of tabs: the
   * entry offered here pointed at an address that has never existed.
   */
  if (staff) {
    out.push({
      label: t("nav.directory"),
      href: "/members",
      icon: Users,
      owns: ["/members", "/members/duplicates", "/import", "/fields", "/tags"],
    });
  }

  /*
   * R16.9. What members have written to the office. It sits beside the
   * directory because it is the same errand: somebody in the church, and what
   * is going on with them.
   */
  if (canAnswerMessages(role)) {
    out.push({ label: t("inbox.title"), href: "/messages", icon: MessageSquare });
  }

  // R5.5. The follow-up screen, for the roles that work it.
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

  /*
   * R13.x. Giving: what came in, the counts the team ran, and the funds it
   * went to. Its own entry rather than a corner of Reports, because a
   * treasurer opens the product for this and nothing else.
   */
  if (canManageGiving(role) || canReadGivingAmounts(role)) {
    out.push({
      label: t("nav.giving"),
      href: "/giving",
      icon: HandCoins,
      owns: ["/giving"],
    });
  }

  // R4.1. A form is a question the church is seen to be asking in public, so
  // Owner and Admin build them.
  if (canManageChurch(role)) {
    out.push({ label: t("form.title"), href: "/forms", icon: ClipboardList });
  }

  if (can(role, "website.manage")) {
    out.push({ label: t("nav.website"), href: "/website", icon: Globe });
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
    owns: ["/settings"],
    icon: Settings,
  });

  /*
   * HRT-202. A volunteer's own work comes before the church's records.
   *
   * Staff read the list in the design's order, because the whole of it is
   * their job and the order was argued once. Somebody who came to run a
   * check-in desk or a serving rota has one errand, and it belongs directly
   * under their own screen rather than three rows down.
   */
  if (!staff) {
    const own = OWN_WORK.find((href) => out.some((one) => one.href === href));
    if (own) {
      const at = out.findIndex((one) => one.href === own);
      const [entry] = out.splice(at, 1);
      out.splice(1, 0, entry!);
    }
  }

  return out;
}

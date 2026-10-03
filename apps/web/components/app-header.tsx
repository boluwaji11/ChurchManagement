import Link from "next/link";
import { Church } from "lucide-react";
import { Avatar, Separator } from "@hearth/ui";
import { Logo } from "./brand";
import {
  canCheckIn, canEditPeople, canFollowUp, canManageServices, canReadIncidents,
  canLeadTeams,
} from "@hearth/db";
import { t } from "@hearth/i18n";
import { churchLogoUrl } from "@/lib/church-logo";
import { DemoBanner } from "./demo-banner";
import { ProvisionalBanner } from "./provisional-banner";
import { NavLink } from "./nav-link";
import { Help } from "./help";
import type { Session } from "@/lib/session";

/**
 * The role shown here comes from tenant_members, not from anything the browser
 * sent. It is the same value the data layer used to answer the request.
 */
export async function AppHeader({ session }: { session: Session }) {
  const logo = await churchLogoUrl(session.tenantId, session.role);

  const mark = logo ? (
    <img
      src={logo}
      alt=""
      className="size-5 shrink-0 rounded-sm object-contain"
    />
  ) : (
    <Church className="size-4 text-fg-muted" aria-hidden />
  );

  return (
    <>
    <DemoBanner tenantId={session.tenantId} />
    <ProvisionalBanner tenantId={session.tenantId} role={session.role} />
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          {/* The two marks go to the two places somebody means by them. Hearth
              is the platform, so it goes to the lobby, where the churches are.
              The church's own name is the church, so it goes to where that
              person's church begins: the records for staff, their own screen
              for everybody else. */}
          <Logo href="/choose-church" />
          <Separator orientation="vertical" className="h-5" />
          <Link
            href={`${
              canEditPeople(session.role) || canReadIncidents(session.role) ? "/people" : "/home"
            }?church=${session.tenantSlug}`}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-label text-fg hover:bg-sunken"
          >
            {mark}
            {session.tenantName}
          </Link>
        </div>

        {/*
          * R3.1. Somebody who is not staff has one screen, so they get no
          * section bar. A row of two links above a page that repeats one of
          * them is how a church ends up with a product nobody opens.
          */}
        <nav
          className="order-3 flex items-center gap-1 sm:order-none"
          aria-label={t("nav.sections")}
        >
          {(canEditPeople(session.role) || canReadIncidents(session.role)
            || canCheckIn(session.role) || canFollowUp(session.role)
            || canLeadTeams(session.role)
            ? [
            /*
             * R3.1. One directory each. Staff work in the church's records; a
             * member sees what the rest of the church chose to publish, and on
             * /people would see nobody but themselves.
             */
            [t("nav.directory"), canEditPeople(session.role) || canReadIncidents(session.role)
              ? "/people"
              : "/directory"],
            // R7.x. Attendance is recorded by the church, not by the congregation.
            ...(canManageServices(session.role)
              ? [[t("nav.services"), "/services"] as const]
              : []),
            // R9.5. Groups are for everybody: finding one is the member's question.
            [t("nav.groups"), "/groups"],
            // R10.1. The rota. A team leader has this and nothing else.
            ...(canLeadTeams(session.role)
              ? [[t("nav.serving"), "/serving"] as const]
              : []),
            // R8.x. The screens for whoever is on the door while a service runs.
            ...(canCheckIn(session.role)
              ? [
                  [t("nav.checkin"), "/checkin"] as const,
                  [t("nav.rooms"), "/checkin/rooms"] as const,
                ]
              : []),
            // R5.5. The Monday morning screen, for the roles that work it.
            ...(canFollowUp(session.role)
              ? [[t("nav.followups"), "/followups"] as const]
              : []),
            // R8.13. Only the roles that handle safeguarding have anywhere to go.
            ...(canReadIncidents(session.role)
              ? [[t("nav.incidents"), "/incidents"] as const]
              : []),
          ]
            : []
          ).map(([label, href]) => (
            <NavLink key={href} href={href} church={session.tenantSlug} label={label} />
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {/* R22.2. In reach from every screen, and quiet until it is asked. */}
          <Help />
          {/* Their name, and everything they administer, in one place. Signing
              out lives there too rather than next to it, since a press beside
              the name somebody aims for is a press they make by accident. */}
          <Link
            href={`/settings?church=${session.tenantSlug}`}
            className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-sunken"
          >
            <Avatar name={session.displayName} id={session.userId} size="sm" />
            <span className="text-label text-fg">{session.displayName}</span>
          </Link>
        </div>
      </div>
    </header>
    </>
  );
}

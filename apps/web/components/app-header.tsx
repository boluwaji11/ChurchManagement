import Link from "next/link";
import { Church, ChevronDown } from "lucide-react";
import { Avatar, Badge, Separator } from "@hearth/ui";
import { SignOutButton } from "./sign-out-button";
import { Logo } from "./brand";
import { t } from "@hearth/i18n";
import { canManageChurch } from "@hearth/db";
import { churchLogoUrl } from "@/lib/church-logo";
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
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Logo href="/people" />
          <Separator orientation="vertical" className="h-5" />
          {session.memberships.length > 1 ? (
            <Link
              href="/choose-church"
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-label text-fg hover:bg-sunken"
            >
              {mark}
              {session.tenantName}
              <ChevronDown className="size-3.5 text-fg-subtle" aria-hidden />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 text-label text-fg">
              {mark}
              {session.tenantName}
            </span>
          )}
        </div>

        <nav className="order-3 flex items-center gap-1 sm:order-none" aria-label={t("nav.sections")}>
          {[
            [t("nav.directory"), "/people"],
            [t("nav.tags"), "/tags"],
            [t("nav.fields"), "/fields"],
            // Settings rename the church for everyone in it, so the link is
            // shown to the roles that can act on it.
            ...(canManageChurch(session.role) ? [[t("nav.settings"), "/settings"]] : []),
          ].map(([label, href]) => (
            <Link
              key={href}
              href={`${href}?church=${session.tenantSlug}`}
              className="rounded-md px-2.5 py-1 text-label text-fg-muted hover:bg-sunken hover:text-fg"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Badge tone="neutral">{t(`role.${session.role}`)}</Badge>
          <Link
            href={`/account?church=${session.tenantSlug}`}
            aria-label={t("nav.account")}
            className="hidden items-center gap-2 rounded-md px-1.5 py-1 hover:bg-sunken sm:flex"
          >
            <Avatar name={session.email} id={session.userId} size="sm" />
            <span className="text-caption text-fg-muted">{session.email}</span>
          </Link>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}

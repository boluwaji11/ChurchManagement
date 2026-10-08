import Link from "next/link";
import { Building2, Gauge, ScrollText, ShieldCheck, UserSearch } from "lucide-react";
import { Avatar } from "@connectapp/ui";
import { Brand } from "./brand";
import { signOut } from "@/app/actions";
import type { Operator } from "@/lib/admin";

const SECTIONS = [
  { href: "/", label: "Signals", icon: Gauge },
  { href: "/churches", label: "Churches", icon: Building2 },
  { href: "/accounts", label: "Accounts", icon: UserSearch },
  { href: "/log", label: "Log", icon: ScrollText },
  { href: "/admins", label: "Operators", icon: ShieldCheck },
] as const;

/**
 * R21.x. The frame every operator screen wears.
 *
 * The mark says ConnectApp Admin rather than ConnectApp, because the one thing
 * this screen must never be mistaken for is a church's own. The sections sit in
 * a frozen rail down the left, the way the product's own shell does.
 */
export function Shell({
  who,
  title,
  lede,
  action,
  children,
}: {
  who: Operator;
  title: string;
  /** One line under the title, when the screen needs it. */
  lede?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="site-wash flex min-h-dvh">
      <nav
        aria-label="Sections"
        className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col gap-1 border-r border-line bg-surface/70 px-3 py-4 backdrop-blur-[8px] md:flex"
      >
        <Link href="/" className="mb-4 flex items-center gap-2.5 px-2 no-underline">
          <Brand />
        </Link>

        {SECTIONS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex min-h-9 items-center gap-2.5 rounded-sm px-2.5 text-[length:var(--d-text-label)] font-medium text-fg-muted no-underline hover:bg-line hover:text-fg"
          >
            <Icon className="size-4 shrink-0 opacity-70" aria-hidden />
            {label}
          </Link>
        ))}

        <div className="mt-auto flex flex-col gap-2 border-t border-line pt-3">
          <span className="flex items-center gap-2.5 px-1">
            <Avatar name={who.name} id={who.id} size="sm" className="size-8 text-[12px]" />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-[13px] font-medium text-fg">{who.name}</span>
              <span className="truncate text-[12px] text-fg-muted">{who.email}</span>
            </span>
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="w-full cursor-pointer rounded-sm px-2.5 py-1.5 text-left text-[13px] font-medium text-fg-muted hover:bg-line hover:text-fg"
            >
              Sign out
            </button>
          </form>
        </div>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* R21.x, R24.6. The same sections across the top of a phone. The
            rail is 232px of a 390px screen, which leaves nothing to read
            the operator's own screens in. */}
        <nav
          aria-label="Sections"
          className="sticky top-0 z-20 flex items-center gap-1 overflow-x-auto border-b border-line bg-surface px-3 py-2 [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden"
        >
          <Link href="/" className="mr-2 flex shrink-0 items-center no-underline">
            <Brand />
          </Link>

          {SECTIONS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-9 shrink-0 items-center gap-2 rounded-sm px-2.5 text-[length:var(--d-text-label)] font-medium whitespace-nowrap text-fg-muted no-underline hover:bg-line hover:text-fg"
            >
              <Icon className="size-4 shrink-0 opacity-70" aria-hidden />
              {label}
            </Link>
          ))}

          {/* The way out, which otherwise lives only in the rail. */}
          <form action={signOut} className="ml-auto shrink-0 pl-2">
            <button
              type="submit"
              className="flex min-h-9 cursor-pointer items-center gap-2 rounded-sm px-2.5 text-[13px] font-medium whitespace-nowrap text-fg-muted hover:bg-line hover:text-fg"
            >
              <Avatar name={who.name} id={who.id} size="sm" className="size-6 text-[11px]" />
              Sign out
            </button>
          </form>
        </nav>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-7">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-6">
          <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
            <div className="flex flex-col gap-1">
              <h1 className="font-display text-[26px] leading-8 text-fg sm:text-[30px] sm:leading-9">{title}</h1>
              {lede ? <p className="text-[length:var(--d-text-body)] text-fg-muted">{lede}</p> : null}
            </div>
            {action}
          </header>

          {children}
        </div>
        </main>
      </div>
    </div>
  );
}

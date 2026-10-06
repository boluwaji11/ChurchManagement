import Link from "next/link";
import { Building2, Gauge, ScrollText, ShieldCheck, UserSearch } from "lucide-react";
import { Avatar } from "@connectapp/ui";
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
        className="sticky top-0 flex h-dvh w-[232px] shrink-0 flex-col gap-1 border-r border-line bg-surface/70 px-3 py-4 backdrop-blur-[8px]"
      >
        <Link href="/" className="mb-4 flex items-center gap-2.5 px-2 no-underline">
          <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-primary text-[15px] font-semibold text-primary-fg">
            C
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="font-display text-[17px] text-fg">ConnectApp</span>
            <span className="text-[12px] font-medium tracking-[0.08em] text-primary uppercase">
              Admin
            </span>
          </span>
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

      <main className="min-w-0 flex-1 px-8 py-7">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-6">
          <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
            <div className="flex flex-col gap-1">
              <h1 className="font-display text-[30px] leading-9 text-fg">{title}</h1>
              {lede ? <p className="text-[length:var(--d-text-body)] text-fg-muted">{lede}</p> : null}
            </div>
            {action}
          </header>

          {children}
        </div>
      </main>
    </div>
  );
}

import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { platform } from "@connectapp/db";
import { Badge, cn } from "@connectapp/ui";
import { requireOperator } from "@/lib/admin";
import { Shell } from "@/components/shell";
import { Since, On } from "@/components/since";

export const dynamic = "force-dynamic";

export const metadata = { title: "Churches - ConnectApp Admin" };

const STANDINGS = [
  { key: "all", label: "All" },
  { key: "provisional", label: "Waiting" },
  { key: "approved", label: "Approved" },
  { key: "archived", label: "Archived" },
] as const;

type Standing = (typeof STANDINGS)[number]["key"];

/**
 * R21.x, R1.1. Every church on the platform.
 *
 * The ones waiting on a person lead, because that is the queue the sixty-minute
 * promise is made of, and the row says enough to make the decision without
 * opening it: who made it, how long ago, and how much is in it.
 */
export default async function ChurchesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; standing?: string }>;
}) {
  const who = await requireOperator();
  const params = await searchParams;
  const standing = (STANDINGS.find((one) => one.key === params.standing)?.key ?? "all") as Standing;
  const query = params.q ?? "";

  const churches = await platform.listChurches(who.id, { query, standing });

  return (
    <Shell
      who={who}
      title="Churches"
      lede="Every church on the platform, newest first."
    >
      <form className="flex flex-wrap items-center gap-2" action="/churches">
        <label className="flex min-w-[260px] flex-1 items-center gap-2 rounded-[var(--d-radius-control)] border border-line-strong bg-surface px-3">
          <Search className="size-4 shrink-0 text-fg-subtle" aria-hidden />
          <input
            name="q"
            defaultValue={query}
            placeholder="e.g. Living Waters"
            aria-label="Search churches"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-[length:var(--d-text-body)] text-fg outline-none"
          />
        </label>

        <div className="flex items-center gap-1 rounded-md bg-sunken p-[3px]">
          {STANDINGS.map((one) => (
            <Link
              key={one.key}
              href={`/churches?standing=${one.key}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
              className={cn(
                "flex h-8 items-center rounded-sm px-3 text-[13px] font-medium no-underline",
                standing === one.key ? "bg-surface text-fg shadow-sm" : "text-fg-muted",
              )}
            >
              {one.label}
            </Link>
          ))}
        </div>
      </form>

      {churches.length === 0 ? (
        <p className="rounded-[16px] border border-dashed border-line-strong p-10 text-center text-[length:var(--d-text-body)] text-fg-muted">
          No church matches that.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-[16px] border border-line bg-surface">
          {churches.map((church) => (
            <li key={church.id}>
              <Link
                href={`/churches/${church.id}`}
                className="group flex flex-wrap items-center gap-4 px-5 py-4 no-underline hover:bg-sunken/60"
              >
                <span className="flex min-w-[220px] flex-[2] flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-fg">{church.name}</span>
                    {church.archivedAt ? (
                      <Badge tone="neutral">Archived</Badge>
                    ) : church.approvedAt ? (
                      <Badge tone="success">Approved</Badge>
                    ) : (
                      <Badge tone="warning">Waiting</Badge>
                    )}
                  </span>
                  <span className="text-[12px] text-fg-subtle">
                    /{church.slug} · {church.timezone}
                  </span>
                </span>

                <span className="flex min-w-[180px] flex-1 flex-col gap-0.5">
                  <span className="text-[13px] text-fg">{church.ownerName ?? "No owner"}</span>
                  <span className="truncate text-[12px] text-fg-subtle">
                    {church.ownerEmail ?? "—"}
                  </span>
                </span>

                <span className="flex min-w-[130px] flex-col gap-0.5 text-[13px] text-fg-muted">
                  <span data-numeric className="tabular-nums">
                    {church.members} members · {church.accounts} accounts
                  </span>
                  <span className="text-[12px] text-fg-subtle">
                    last seen <Since at={church.lastActivity} />
                  </span>
                </span>

                <span className="flex min-w-[110px] flex-col items-end gap-0.5">
                  <span className="text-[12px] text-fg-subtle">
                    made <On at={church.createdAt} />
                  </span>
                  <ArrowRight
                    className="size-4 text-fg-subtle group-hover:text-primary"
                    aria-hidden
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}

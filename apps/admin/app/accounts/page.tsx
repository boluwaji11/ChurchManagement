import { platform } from "@connectapp/db";
import { requireOperator } from "@/lib/admin";
import { Shell } from "@/components/shell";
import { Find } from "./find";

export const dynamic = "force-dynamic";

export const metadata = { title: "Accounts - ConnectApp Admin" };

/**
 * R21.x. The support lookup.
 *
 * The question that arrives is always "I cannot sign in", and the answer is
 * nearly always which church the address actually belongs to. That is all this
 * screen shows: a church's records are the church's.
 */
export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const who = await requireOperator();
  const { q } = await searchParams;
  const hits = q ? await platform.findAccount(who.id, q) : [];

  return (
    <Shell who={who} title="Accounts" lede="Which churches an address can sign in to.">
      <Find query={q ?? ""} />

      {q && hits.length === 0 ? (
        <p className="rounded-[16px] border border-dashed border-line-strong p-10 text-center text-[length:var(--d-text-body)] text-fg-muted">
          No account signs in with that.
        </p>
      ) : null}

      {hits.length > 0 ? (
        <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-[16px] border border-line bg-surface">
          {hits.map((hit) => (
            <li key={hit.userId} className="flex flex-col gap-2 px-5 py-4">
              <span className="font-semibold text-fg">{hit.email}</span>
              {hit.churches.length === 0 ? (
                <span className="text-[13px] text-fg-muted">In no church.</span>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {hit.churches.map((church) => (
                    <li
                      key={church.slug}
                      className="flex h-[26px] items-center rounded-full bg-sunken px-2.5 text-[12px] font-medium text-fg"
                    >
                      {church.name} · {church.role}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </Shell>
  );
}

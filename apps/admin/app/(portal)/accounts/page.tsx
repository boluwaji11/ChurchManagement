import { platform } from "@connectapp/db";
import { requireTeamMember } from "@/lib/admin";
import { Screen } from "@/components/screen";
import { Find } from "./find";
import { EmptyState } from "@connectapp/ui";

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
  const who = await requireTeamMember();
  const { q } = await searchParams;
  const hits = q ? await platform.findAccount(who.id, q) : [];

  return (
    <Screen title="Accounts" lede="Which churches an address can sign in to.">
      <Find query={q ?? ""} />

      {q && hits.length === 0 ? (
        <EmptyState title="No account signs in with that." />
      ) : null}

      {hits.length > 0 ? (
        <ul className="m-0 flex list-none flex-col divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface p-0">
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
    </Screen>
  );
}

import { Search } from "lucide-react";

/** R21.x. One box, answered on the server so the address is linkable. */
export function Find({ query }: { query: string }) {
  return (
    <form action="/accounts" className="flex flex-wrap items-center gap-2">
      <label className="flex min-w-[280px] flex-1 items-center gap-2 rounded-[var(--d-radius-control)] border border-line-strong bg-surface px-3">
        <Search className="size-4 shrink-0 text-fg-subtle" aria-hidden />
        <input
          name="q"
          defaultValue={query}
          placeholder="e.g. mike@connectapp.church"
          aria-label="Search accounts"
          className="min-w-0 flex-1 bg-transparent py-2.5 text-[length:var(--d-text-body)] text-fg outline-none"
        />
      </label>
    </form>
  );
}

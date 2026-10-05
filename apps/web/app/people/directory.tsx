"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X, Archive, Upload, Download, Plus, CircleDot, Mail, Merge, ListFilter, Pencil, Copy, Cake, Printer, SlidersHorizontal, Check, Tag, CheckCircle2 } from "lucide-react";
import {
  Avatar, Badge, Button, Field, Input, Textarea, Checkbox, Banner, HueDot,
  IconButton,
  Select, SelectTrigger, SelectContent, SelectItem,
  Dialog, DialogTrigger, DialogContent, DialogFooter, DialogClose,
  Tabs, TabsList, TabsTrigger,
  cn, type Hue,
} from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import { Empty } from "@/components/empty";
import { LIFECYCLE_VALUES, lifecycleLabel } from "@/lib/person-input";
import { bulkStatus, bulkTag, bulkAddToGroup, type BulkResult } from "./bulk-actions";
import { Pages } from "@/components/pages";
import { rename, archiveList } from "./list-actions";

export interface ListOption {
  id: string;
  name: string;
  kind: "static" | "rule";
  count: number | null;
}

export interface Row {
  id: string;
  displayName: string;
  lifecycleStatus: string;
  householdName: string | null;
  primaryEmail: string | null;
  primaryPhone: string | null;
  /** R2.14. The tag names, for the column the design gives them. */
  tagNames: string[];
  archived: boolean;
}

/** What a cell with nothing in it reads as. */
const EMPTY = "\u2014";

export interface TagOption {
  id: string;
  name: string;
  hue: string;
}

/** R9.4. A group the people on screen can be put into. */
export interface GroupOption {
  id: string;
  name: string;
  hue?: string | null;
}

/**
 * R2.2. Where somebody is in the life of the church, as a colour.
 *
 * Member is fern, a regular is sky, a visitor is amber. Three hues far enough
 * apart to tell at a glance down a column of two hundred rows.
 */
const STATUS_HUE: Record<string, string> = {
  member: "fern",
  regular_attender: "sky",
  visitor: "amber",
  inactive: "clay",
  deceased: "clay",
};

const ANY = "__any";

/** Radix needs a value, and an empty string is not one. */

/**
 * The directory: searching, filtering, sorting, and acting on a selection.
 *
 * Search and filter live in the URL rather than in component state. A church
 * office shares "everyone with no email address" by sending the link, the back
 * button does what a back button should, and a filtered export exports what the
 * filter says because the server ran the same query.
 *
 * The selection does not live in the URL. It is a thing you are holding, not a
 * place you are at.
 */
export function Directory({
  church,
  rows,
  tags,
  groups,
  canEdit,
  canArchive,
  page,
  perPage,
  matching,
  counts,
  duplicates,
  lists,
  viewing,
}: {
  church: string;
  rows: Row[];
  tags: TagOption[];
  /** R9.4. The groups the selection can be put into. */
  groups: GroupOption[];
  canEdit: boolean;
  canArchive: boolean;
  page: number;
  perPage: number;
  /** R2.14. How many people are at each status, for the filter drawer. */
  counts: Record<string, number>;
  /** R2.8. How many pairs are waiting, for the badge on Duplicates. */
  duplicates: number;
  /** How many people match the filters, across every page. */
  matching: number;
  /** R1.14. The church's saved lists. */
  lists: ListOption[];
  /** R1.14. The list being looked at, when one was opened. */
  viewing: { id: string; name: string; kind: "static" | "rule" } | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [selected, setSelected] = React.useState<string[]>([]);
  const [result, setResult] = React.useState<BulkResult>();
  const [pending, startTransition] = React.useTransition();

  // The selection only ever held rows on screen, so leaving the page drops it.
  React.useEffect(() => setSelected([]), [page]);

  const q = params.get("q") ?? "";
  const [search, setSearch] = React.useState(q);
  React.useEffect(() => setSearch(q), [q]);

  /** Rewrites the URL, dropping empty values so a shared link stays readable. */
  const setParam = React.useCallback(
    (changes: Record<string, string | undefined>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (!value || value === ANY) next.delete(key);
        else next.set(key, value);
      }
      // Narrowing the list while standing on page four would otherwise show
      // nothing, which reads as "no results" rather than "you moved".
      if (!("page" in changes)) next.delete("page");
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  // Debounced, because a query per keystroke is a query per keystroke.
  React.useEffect(() => {
    if (search === q) return;
    const timer = setTimeout(() => setParam({ q: search || undefined }), 250);
    return () => clearTimeout(timer);
  }, [search, q, setParam]);

  const visible = rows.map((r) => r.id);
  const allSelected = visible.length > 0 && visible.every((id) => selected.includes(id));
  const someSelected = selected.length > 0 && !allSelected;

  const toggleAll = () => setSelected(allSelected ? [] : visible);
  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const act = (fn: (d: FormData) => Promise<BulkResult>, extra: Record<string, string>) => {
    const data = new FormData();
    data.set("church", church);
    for (const [k, v] of Object.entries(extra)) data.set(k, v);
    for (const id of selected) data.append("ids", id);

    setResult(undefined);
    startTransition(async () => {
      const outcome = await fn(data);
      setResult(outcome);
      if (!outcome.error) {
        setSelected([]);
        router.refresh();
      }
    });
  };

  const filtersOn = ["q", "status", "tag", "has", "show"].some((k) => params.get(k));
  const exportHref = `/api/export?church=${church}&${params.toString()}`;

  const statusNow = params.get("status") ?? "all";
  const joinedNow = params.get("joined") ?? "any";
  const tagNow = params.get("tag");
  const missingNow = params.get("missing") === "1";

  // What the Filter button counts, so "Filter · 2" says how much is narrowing
  // the list. Search sits outside it, in its own box.
  const narrowing =
    (statusNow !== "all" ? 1 : 0) + (tagNow ? 1 : 0) +
    (joinedNow !== "any" ? 1 : 0) + (missingNow ? 1 : 0) +
    (params.get("group") ? 1 : 0) + (params.get("serving") ? 1 : 0) +
    (params.get("seen") ? 1 : 0);

  const first = (page - 1) * perPage + 1;
  const upto = Math.min(page * perPage, matching);

  return (
    <>
      {/* The row across the top: what you are looking for on the left, what you
          can do to the list on the right. */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-[34px] min-w-40 flex-[0_1_220px] items-center gap-2 rounded-md border border-line-strong bg-surface px-2.5 text-fg-subtle">
          <Search className="size-[15px] shrink-0" aria-hidden />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("directory.searchPlaceholder")}
            aria-label={t("directory.search")}
            className="min-w-0 flex-1 border-none bg-transparent text-[13px] text-fg outline-none placeholder:text-fg-subtle"
          />
        </label>

        {/* R24.6. The one thing this screen is for sits with the search, and
            the things that act on the list follow after it. */}
        {canEdit ? (
          <Button asChild>
            <Link href={`/people/new?church=${church}`}>
              <Plus /> {t("people.add")}
            </Link>
          </Button>
        ) : null}

        <span className="flex-1" />

        <FilterDrawer
          tags={tags}
          counts={counts}
          matching={matching}
          params={params}
          setParam={setParam}
          onClear={() => router.replace(pathname, { scroll: false })}
          narrowing={narrowing}
        />

        {canArchive ? (
          <ToolButton href={`/duplicates?church=${church}`}>
            <Copy /> {t("merge.title")}
            {duplicates > 0 ? (
              <span className="rounded-full bg-danger px-1.5 text-[11px] font-semibold text-white">
                {duplicates}
              </span>
            ) : null}
          </ToolButton>
        ) : null}

        <ToolButton href={`/people/celebrations?church=${church}`}>
          <Cake /> {t("celebrations.open")}
        </ToolButton>

        <ToolButton href={`/people/print?church=${church}`} target="_blank">
          <Printer /> {t("people.printAll")}
        </ToolButton>

        <ToolButton href={exportHref}>
          <Download /> {t("directory.exportView")}
        </ToolButton>

        {canEdit ? (
          <ToolButton href={`/import?church=${church}`}>
            <Upload /> {t("import.title")}
          </ToolButton>
        ) : null}
      </div>

      {result?.error ? <Banner tone="danger" title={t("import.failed")}>{result.error}</Banner> : null}
      {result && !result.error && result.changed !== undefined ? (
        <Banner tone="success" title={t("directory.bulkDone", { count: result.changed })} />
      ) : null}

      {/* R1.14. Which list is being read, and the way back to everybody. */}
      {viewing ? <ListBar church={church} list={viewing} canEdit={canEdit} /> : null}

      {selected.length > 0 && canEdit ? (
        <SelectionBar
          church={church}
          lists={lists}
          viewing={viewing}
          count={selected.length}
          ids={selected}
          tags={tags}
          groups={groups}
          mergeHref={
            canArchive && selected.length === 2
              ? `/duplicates?church=${church}&a=${selected[0]}&b=${selected[1]}`
              : null
          }
          pending={pending}
          onClear={() => setSelected([])}
          onTag={(tagId, on) => act(bulkTag, { tagId, on: on ? "1" : "0" })}
          onGroup={(groupId) => act(bulkAddToGroup, { groupId })}
          onStatus={(status) => act(bulkStatus, { status })}
        />
      ) : null}

      {rows.length === 0 ? (
        <Empty
          icon={filtersOn ? "noResults" : "people"}
          title={filtersOn ? t("directory.noResults.title") : t("people.empty.title")}
          body={filtersOn ? t("directory.noResults.body") : t("people.empty.body")}
          action={
            filtersOn ? (
              <Button variant="secondary" onClick={() => router.replace(pathname, { scroll: false })}>
                <X /> {t("directory.clear")}
              </Button>
            ) : canEdit ? (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button asChild>
                  <Link href={`/people/new?church=${church}`}>
                    <Plus /> {t("people.add")}
                  </Link>
                </Button>
                <Button variant="secondary" asChild>
                  <Link href={`/import?church=${church}`}>
                    <Upload /> {t("import.title")}
                  </Link>
                </Button>
              </div>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-auto rounded-lg border border-line bg-surface">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="text-left text-[12px] font-semibold text-fg">
                {canEdit ? (
                  <th className="w-10 border-b border-line px-4 py-3 font-medium">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? "indeterminate" : false}
                      onCheckedChange={toggleAll}
                      aria-label={t("directory.selectAll")}
                    />
                  </th>
                ) : null}
                <th className="border-b border-line px-4 py-3 font-medium">{t("people.column.person")}</th>
                <th className="border-b border-line px-4 py-3 font-medium">{t("people.column.household")}</th>
                <th className="border-b border-line px-4 py-3 font-medium">{t("people.column.status")}</th>
                <th className="border-b border-line px-4 py-3 font-medium">{t("people.column.tags")}</th>
                <th className="border-b border-line px-4 py-3 font-medium">{t("people.column.email")}</th>
                <th className="border-b border-line px-4 py-3 font-medium">{t("people.column.phone")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                /* The whole row opens the person, which is what the design
                   does and what a two hundred row list needs. The name stays a
                   real link underneath it, so the keyboard, the middle button
                   and "copy link address" all still work. */
                <tr
                  key={p.id}
                  onClick={() => router.push(`/people/${p.id}?church=${church}`)}
                  // A picked row is tinted, so the selection is visible while
                  // the eye is on the names rather than on the checkboxes.
                  className="cursor-pointer hover:bg-canvas data-[selected]:bg-primary-soft"
                  data-selected={selected.includes(p.id) || undefined}
                >
                  {canEdit ? (
                    <td
                      className="border-b border-sunken px-4 py-2.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={selected.includes(p.id)}
                        onCheckedChange={() => toggle(p.id)}
                        aria-label={t("directory.select", { name: p.displayName })}
                      />
                    </td>
                  ) : null}
                  <td className="border-b border-sunken px-4 py-2.5">
                    <Link
                      href={`/people/${p.id}?church=${church}`}
                      className="flex items-center gap-2.5 font-medium text-fg"
                    >
                      <Avatar name={p.displayName} id={p.id} size="sm" className="size-7 text-[11px] font-semibold" />
                      <span className="truncate">{p.displayName}</span>
                    </Link>
                  </td>
                  <td className="border-b border-sunken px-4 py-2.5 text-fg-muted">
                    {p.householdName ?? EMPTY}
                  </td>
                  <td className="border-b border-sunken px-4 py-2.5">
                    <StatusPill status={p.lifecycleStatus} />
                  </td>
                  <td className="border-b border-sunken px-4 py-2.5 text-[13px] text-fg-muted">
                    {p.tagNames.length > 0 ? p.tagNames.join(", ") : EMPTY}
                  </td>
                  <td className="border-b border-sunken px-4 py-2.5 text-[13px] text-fg-muted">
                    {p.primaryEmail ?? EMPTY}
                  </td>
                  <td className="border-b border-sunken px-4 py-2.5 text-[13px] text-fg-muted tabular-nums">
                    {p.primaryPhone ?? EMPTY}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[13px] text-fg-muted">
          {matching === 0
            ? t("directory.none")
            : t("directory.showing", { range: t("directory.range", { first, upto, matching }) })}
        </span>
        <Pages
          page={page}
          last={Math.max(1, Math.ceil(matching / perPage))}
          onPage={(n) => setParam({ page: n <= 1 ? undefined : String(n) })}
        />
      </div>
    </>
  );
}

/** A 34px secondary control. The row of them above the list is all this shape. */
function ToolButton({
  href,
  target,
  children,
}: {
  href: string;
  target?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      target={target}
      className="flex h-[34px] items-center gap-1.5 rounded-md border border-line-strong bg-surface px-3 text-[13px] font-medium text-fg hover:bg-sunken [&_svg]:size-4"
    >
      {children}
    </Link>
  );
}

function StatusPill({ status }: { status: string }) {
  const hue = STATUS_HUE[status] ?? "clay";
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-medium"
      style={{ background: `var(--hue-${hue}-tint)`, color: `var(--hue-${hue}-key)` }}
    >
      {lifecycleLabel(status)}
    </span>
  );
}



/**
 * R2.14. The filter drawer.
 *
 * 380px in from the right over a dim, which keeps the list behind it in view
 * while you narrow it. Status, tags, when they joined, and whether we are
 * missing a way to reach them. The footer says how many come back.
 */
function FilterDrawer({
  tags,
  counts,
  matching,
  params,
  setParam,
  onClear,
  narrowing,
}: {
  tags: TagOption[];
  counts: Record<string, number>;
  matching: number;
  params: URLSearchParams;
  setParam: (changes: Record<string, string | undefined>) => void;
  onClear: () => void;
  narrowing: number;
}) {
  const [open, setOpen] = React.useState(false);

  const status = params.get("status") ?? "all";
  const joined = params.get("joined") ?? "any";
  const tag = params.get("tag");
  const missing = params.get("missing") === "1";

  const everyone = Object.values(counts).reduce((a, b) => a + b, 0);
  const statuses: Array<[string, number]> = [
    ["all", everyone],
    ["member", counts.member ?? 0],
    ["regular_attender", counts.regular_attender ?? 0],
    ["visitor", counts.visitor ?? 0],
  ];
  const joins = ["any", "year", "five", "earlier"] as const;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        className={cn(
          "flex h-[34px] items-center gap-1.5 rounded-md border px-3 text-[13px] font-medium [&_svg]:size-4",
          narrowing > 0
            ? "border-primary bg-primary-soft text-primary"
            : "border-line-strong bg-surface text-fg hover:bg-sunken",
        )}
      >
        <SlidersHorizontal />
        {narrowing > 0 ? t("directory.filterOn", { count: narrowing }) : t("directory.filter")}
      </button>

      {open ? (
        <div className="fixed inset-0 z-40 flex justify-end bg-overlay" onClick={() => setOpen(false)}>
          <aside
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-[min(380px,100%)] flex-col bg-canvas shadow-[-8px_0_24px_oklch(0_0_0/0.12)]"
          >
            <div className="flex items-center gap-3 border-b border-line px-6 py-[18px]">
              <span className="flex-1 font-display text-[22px] text-fg">
                {t("directory.filterTitle")}
              </span>
              <IconButton label={t("common.close")} onClick={() => setOpen(false)}>
                <X />
              </IconButton>
            </div>

            <div className="flex flex-1 flex-col gap-6 overflow-auto px-6 py-5">
              <FilterGroup label={t("directory.filterStatus")}>
                {statuses.map(([value, n]) => (
                  <ChipButton
                    key={value}
                    tone="ink"
                    on={status === value}
                    onClick={() => setParam({ status: value === "all" ? undefined : value })}
                  >
                    {t(`directory.status.${value}` as never)}
                    <span className="ml-1 opacity-60">{n}</span>
                  </ChipButton>
                ))}
              </FilterGroup>

              {tags.length > 0 ? (
                <FilterGroup label={t("directory.filterTag")}>
                  {tags.map((one) => (
                    <ChipButton
                      key={one.id}
                      on={tag === one.id}
                      onClick={() => setParam({ tag: tag === one.id ? undefined : one.id })}
                    >
                      {one.name}
                    </ChipButton>
                  ))}
                </FilterGroup>
              ) : null}

              <FilterGroup label={t("directory.filterJoined")}>
                <div className="flex flex-wrap gap-0.5 self-start rounded-md bg-sunken p-[3px]">
                  {joins.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setParam({ joined: value === "any" ? undefined : value })}
                      className={cn(
                        "h-7 cursor-pointer rounded-sm px-3 text-[13px] font-medium",
                        joined === value ? "bg-surface text-fg shadow-sm" : "text-fg-muted",
                      )}
                    >
                      {t(`directory.joined.${value}` as never)}
                    </button>
                  ))}
                </div>
              </FilterGroup>

              {/* What somebody does, which is the half of a directory that
                  starts a conversation: who comes and belongs to nothing, who
                  serves, who has not been seen for a month. */}
              <FilterGroup label={t("directory.filterGroup")}>
                {(["any", "none"] as const).map((value) => (
                  <ChipButton
                    key={value}
                    on={params.get("group") === value}
                    onClick={() =>
                      setParam({ group: params.get("group") === value ? undefined : value })
                    }
                  >
                    {t(`directory.group.${value}` as never)}
                  </ChipButton>
                ))}
              </FilterGroup>

              <FilterGroup label={t("directory.filterServing")}>
                {(["any", "none"] as const).map((value) => (
                  <ChipButton
                    key={value}
                    on={params.get("serving") === value}
                    onClick={() =>
                      setParam({ serving: params.get("serving") === value ? undefined : value })
                    }
                  >
                    {t(`directory.serving.${value}` as never)}
                  </ChipButton>
                ))}
              </FilterGroup>

              <FilterGroup label={t("directory.filterSeen")}>
                {(["recent", "absent"] as const).map((value) => (
                  <ChipButton
                    key={value}
                    on={params.get("seen") === value}
                    onClick={() =>
                      setParam({ seen: params.get("seen") === value ? undefined : value })
                    }
                  >
                    {t(`directory.seen.${value}` as never)}
                  </ChipButton>
                ))}
              </FilterGroup>

              <FilterGroup label={t("directory.filterContact")}>
                <ChipButton on={missing} onClick={() => setParam({ missing: missing ? undefined : "1" })}>
                  <span
                    className={cn(
                      "grid size-4 place-items-center rounded-[4px] [&_svg]:size-[11px]",
                      missing ? "bg-primary text-white" : "border border-line-strong text-transparent",
                    )}
                  >
                    <Check />
                  </span>
                  {t("directory.missing")}
                </ChipButton>
              </FilterGroup>
            </div>

            <div className="flex items-center gap-3 border-t border-line px-6 py-4">
              <Button variant="secondary" onClick={onClear}>{t("directory.clear")}</Button>
              <Button className="flex-1" onClick={() => setOpen(false)}>
                {plural("directory.show", matching)}
              </Button>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-[13px] font-semibold text-fg">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

/**
 * A 34px pill. Two kinds, as the design has them.
 *
 * A status is one of a set, so the chosen one is filled in ink and reads white:
 * it is answering "which of these". A tag is a thing you switch on, so it takes
 * the accent and a heavier edge and leaves the rest alone.
 */
function ChipButton({
  on,
  onClick,
  tone = "accent",
  children,
}: {
  on: boolean;
  onClick: () => void;
  tone?: "ink" | "accent";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "flex h-[34px] cursor-pointer items-center gap-2 rounded-full px-3.5 text-[13px] font-medium",
        !on && "border border-line-strong bg-surface text-fg hover:bg-sunken",
        on && tone === "ink" && "border border-fg bg-fg text-canvas",
        on && tone === "accent" && "border-[1.5px] border-primary bg-primary-soft text-primary",
      )}
    >
      {children}
    </button>
  );
}

function SelectionBar({
  church,
  lists,
  viewing,
  count,
  ids,
  tags,
  groups,
  mergeHref,
  pending,
  onClear,
  onTag,
  onGroup,
  onStatus,
}: {
  church: string;
  lists: ListOption[];
  viewing: { id: string; name: string; kind: "static" | "rule" } | null;
  count: number;
  ids: string[];
  tags: TagOption[];
  groups: GroupOption[];
  /** R2.8. Set when exactly two are picked. */
  mergeHref: string | null;
  pending: boolean;
  onClear: () => void;
  onTag: (tagId: string, on: boolean) => void;
  onGroup: (groupId: string) => void;
  onStatus: (status: string) => void;
}) {
  return (
    <div
      className={cn(
        // Over the table rather than above it, so the rows somebody is picking
        // from stay where they were while they pick.
        "fixed bottom-6 left-1/2 z-30 flex max-w-[calc(100vw-2rem)] -translate-x-1/2",
        "items-center gap-1 overflow-x-auto whitespace-nowrap rounded-full",
        "border border-line-strong bg-surface px-4 py-2 shadow-lg",
        pending && "opacity-60",
      )}
      aria-live="polite"
    >
      <span className="px-1 text-[13px] font-semibold text-fg">
        {plural("directory.selected", count)}
      </span>

      <span aria-hidden className="mx-1 h-5 w-px bg-line" />

      {/* R16.x. The composer is deferred, so this opens the same shell the
          person screen does and sends nothing. */}
      <BulkMessage count={count} />

      {tags.length > 0 ? (
        <Picker
          label={t("directory.bulkTag")}
          icon={<Tag />}
          options={tags.map((x) => ({ value: x.id, label: x.name, hue: x.hue }))}
          onPick={(v) => onTag(v, true)}
        />
      ) : null}

      {groups.length > 0 ? (
        <Picker
          label={t("directory.bulkGroup")}
          icon={<CircleDot />}
          options={groups.map((g) => ({ value: g.id, label: g.name, hue: g.hue ?? undefined }))}
          onPick={onGroup}
        />
      ) : null}

      <Picker
        label={t("directory.bulkStatus")}
        icon={<CheckCircle2 />}
        options={LIFECYCLE_VALUES.map((v) => ({ value: v, label: lifecycleLabel(v) }))}
        onPick={onStatus}
      />

      <Button
        variant="ghost"
        className="min-h-9 rounded-full px-2.5 text-[13px]"
        asChild
      >
        <a href={`/api/export?church=${church}&ids=${ids.join(",")}`}>
          <Download /> {t("directory.bulkExport")}
        </a>
      </Button>

      {/* R2.8. Two people picked is the question "are these the same person",
          and the merge screen is where it is answered. */}
      {mergeHref ? (
        <Button variant="ghost" className="min-h-9 rounded-full px-2.5 text-[13px]" asChild>
          <Link href={mergeHref}>
            <Merge /> {t("directory.merge")}
          </Link>
        </Button>
      ) : null}

      <IconButton label={t("directory.clearSelection")} variant="ghost" onClick={onClear}>
        <X />
      </IconButton>
    </div>
  );
}

/**
 * R16.x. The shell of the message the design draws on this bar.
 *
 * Messaging is deferred, so this opens, takes what somebody would send, and
 * sends nothing. It is here because the bar in the design has it and because
 * the person screen already carries the same shell.
 */
function BulkMessage({ count }: { count: number }) {
  const [channel, setChannel] = React.useState("email");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="min-h-9 rounded-full px-2.5 text-[13px]">
          <Mail /> {t("directory.bulkMessage")}
        </Button>
      </DialogTrigger>
      <DialogContent title={t("directory.messageTitle", { count })} closeLabel={t("common.close")}>
        <div className="flex flex-col gap-4">
          <Tabs value={channel} onValueChange={setChannel}>
            <TabsList>
              <TabsTrigger value="email">{t("message.email")}</TabsTrigger>
              <TabsTrigger value="sms">{t("message.textMessage")}</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* A subject belongs to an email. A text has none. */}
          {channel === "email" ? (
            <Field label={t("message.subject")}>
              <Input name="subject" autoComplete="off" />
            </Field>
          ) : null}

          <Field label={t("message.text")}>
            <Textarea name="body" rows={6} placeholder={t("message.hint")} />
          </Field>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" data-dismiss>{t("action.cancel")}</Button>
          </DialogClose>
          <Button disabled>
            {channel === "email" ? t("message.sendEmail") : t("message.sendText")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * A menu that fires on choice and resets.
 *
 * On the selection bar, where a labelled field would push the bar onto two
 * rows: an icon and a word, the way the rest of the bar reads.
 */
function Picker({
  label,
  icon,
  options,
  onPick,
}: {
  label: string;
  icon?: React.ReactNode;
  options: { value: string; label: string; hue?: string }[];
  onPick: (value: string) => void;
}) {
  const [key, setKey] = React.useState(0);
  return (
    <Select
      key={key}
      value=""
      onValueChange={(v) => {
        onPick(v);
        setKey((k) => k + 1);
      }}
    >
      <SelectTrigger
        aria-label={label}
        // The trigger carries its own words, so the placeholder grey that a
        // Select uses for "nothing chosen" would read as disabled here.
        className="min-h-9 w-auto gap-1.5 rounded-full border-0 bg-transparent px-2.5 text-[13px] font-medium text-fg shadow-none hover:bg-sunken data-[placeholder]:text-fg [&_svg]:size-4"
      >
        {icon}
        {label}
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            <span className="inline-flex items-center gap-2">
              {o.hue ? <HueDot hue={o.hue as Hue} /> : null}
              {o.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** R1.14. The list on screen, and the two things a church does to one. */
function ListBar({
  church,
  list,
  canEdit,
}: {
  church: string;
  list: { id: string; name: string; kind: "static" | "rule" };
  canEdit: boolean;
}) {
  const router = useRouter();
  const [renaming, setRenaming] = React.useState(false);
  const [archiving, setArchiving] = React.useState(false);
  const [failed, setFailed] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-3">
      {failed ? <Banner tone="danger" title={t("import.failed")}>{failed}</Banner> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <ListFilter className="size-4 text-fg-muted" aria-hidden />
          <span className="text-title text-fg">{list.name}</span>
          <Badge tone="neutral">{t(`lists.kind.${list.kind}`)}</Badge>
        </span>

        <span className="flex flex-wrap items-center gap-1">
          {canEdit ? (
            <>
              <Button variant="ghost" onClick={() => setRenaming(true)}>
                <Pencil /> {t("lists.rename")}
              </Button>
              <Button variant="ghost" onClick={() => setArchiving(true)}>
                <Archive /> {t("lists.archive")}
              </Button>
            </>
          ) : null}
          <Button variant="ghost" asChild>
            <Link href={`/people?church=${church}`}>
              <X /> {t("directory.clear")}
            </Link>
          </Button>
        </span>
      </div>

      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent title={t("lists.renameTitle", { name: list.name })} closeLabel={t("common.close")}>
          <form
            noValidate
            action={(data) =>
              startTransition(async () => {
                const result = await rename(list.id, String(data.get("name") ?? ""), church);
                setFailed(result.error);
                if (!result.error) {
                  setRenaming(false);
                  router.refresh();
                }
              })
            }
            className="flex flex-col gap-4"
          >
            <Field label={t("lists.name")} required>
              <Input name="name" defaultValue={list.name} autoComplete="off" autoFocus />
            </Field>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setRenaming(false)}>
                {t("action.cancel")}
              </Button>
              <Button type="submit" loading={pending}>{t("action.save")}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={archiving} onOpenChange={setArchiving}>
        <DialogContent alert title={t("lists.archiveTitle", { name: list.name })}>
          <p className="mb-5 text-[length:var(--d-text-body)] text-fg">{t("lists.archiveBody")}</p>
          <DialogFooter>
            <Button variant="ghost" data-dismiss onClick={() => setArchiving(false)}>
              {t("lists.archiveKeep")}
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                setArchiving(false);
                startTransition(async () => {
                  const result = await archiveList(list.id, true, church);
                  setFailed(result.error);
                  if (!result.error) router.push(`/people?church=${church}`);
                });
              }}
            >
              <Archive /> {t("lists.archive")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

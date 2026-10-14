"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FilterDrawer, SortDrawer } from "@/components/filter-drawer";
import { MultiSelect } from "@/components/multi-select";
import { ResizableTable } from "@/components/resizable-columns";
import { Download as FileDownload } from "@/components/download";
import { X, Archive, ArchiveRestore, Upload, Download, Plus, CircleDot, Mail, Merge, ListFilter, Pencil, Copy, Cake, Printer, Tag, CheckCircle2, ListMinus, ChevronDown, ArrowUp, ArrowDown, ChevronsUpDown, Send, FileText } from "lucide-react";
import {
  Avatar, Button, Field, Input, Textarea, Checkbox, Banner, HueDot, Tooltip,
  Spinner,
  IconButton,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Switch,
  Dialog, DialogTrigger, DialogContent, DialogFooter, DialogClose,
  Tabs, TabsList, TabsTrigger,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator,
  cn, type Hue,
} from "@connectapp/ui";
import { t, plural } from "@connectapp/i18n";
import { Said } from "@/components/said";
import { Empty } from "@/components/empty";
import { LIFECYCLE_VALUES, lifecycleLabel, lifecycleOptions } from "@/lib/person-input";
import { bulkArchive, bulkStatus, bulkTag, bulkAddToGroup, type BulkResult } from "./bulk-actions";
import { Pages } from "@/components/pages";
import { useAnswered } from "@/components/form-actions";
import { rename, archiveList, takeOffList } from "./list-actions";
import { SaveView, OpenList, AddToList } from "./saved-lists";
import { SearchField } from "@/components/search-field";

export interface ListOption {
  id: string;
  /** R1.14. The list's name in an address, which every link to it carries. */
  slug: string;
  name: string;
  kind: "static" | "rule";
  count: number | null;
}

export interface Row {
  id: string;
  slug: string;
  displayName: string;
  /** R2.9. Their face, when the church has one for them. */
  photoUrl?: string | null;
  lifecycleStatus: string;
  householdName: string | null;
  primaryEmail: string | null;
  primaryPhone: string | null;
  /** R2.14. Their tags, each with its hue, for the column the design gives them. */
  tags: { name: string; hue: string }[];
  archived: boolean;
}

/** What a cell with nothing in it reads as. */
const EMPTY = "\u2014";

export interface TagOption {
  id: string;
  /** R1.13. What the tag is called in this screen's address. */
  slug: string | null;
  name: string;
  hue: string;
}

/** R9.4. A group the members on screen can be put into. */
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

/** Where this browser remembers whether the list follows each answer. */
const LIVE_FILTER = "directory:live-filter";

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
  putAway = false,
  rows,
  tags,
  groups,
  canEdit,
  canArchive,
  page,
  perPage,
  matching,
  duplicates,
  lists,
  viewing,
  listHref,
}: {
  church: string;
  /** R2.4. The archived view: the same list, holding the people archived. */
  putAway?: boolean;
  rows: Row[];
  tags: TagOption[];
  /** R9.4. The groups the selection can be put into. */
  groups: GroupOption[];
  canEdit: boolean;
  canArchive: boolean;
  page: number;
  perPage: number;
  /** R2.8. How many pairs are waiting, for the badge on Duplicates. */
  duplicates: number;
  /** How many members match the filters, across every page. */
  matching: number;
  /** R1.14. The church's saved lists. */
  lists: ListOption[];
  /** R1.14. The list being looked at, when one was opened. */
  viewing: { id: string; name: string; kind: "static" | "rule" } | null;
  /**
   * R2.1. The list's own address, filters and all, worked out on the server.
   *
   * It cannot be read from the browser once a record is open over the list:
   * the address is then the record's, and the list's own filters are inside
   * that record's returnTo. Reading it from there gave every row a way back to
   * the record on top of it, wrapped in the way back to the one before that.
   */
  listHref: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  /*
   * R2.1, R24.6. The list's own address, which is always the list's.
   *
   * The window over the list is a parallel route, so while a record is open
   * `usePathname()` reads that record and the parameters still carry the
   * `returnTo` that opened it. Building the rows' links from those gave every
   * row a way back to the record on top of it, wrapped in the way back to the
   * record before that: a tap produced
   * `/members/a?returnTo=/members/b?returnTo=%2Fmembers` and it grew with
   * every tap.
   *
   * The list lives at /members whatever is open over it, and `returnTo` is
   * never part of what it is looking at.
   */
  const directoryHref = listHref;
  const addMemberHref = `/members/new?returnTo=${encodeURIComponent(directoryHref)}`;
  const memberHref = (slug: string) =>
    `/members/${slug}?returnTo=${encodeURIComponent(directoryHref)}`;

  const [selected, setSelected] = React.useState<string[]>([]);
  /** R2.8. A row's own id read back as the name in its address. */
  const slugOf = (id: string | undefined) =>
    (id ? rows.find((row) => row.id === id)?.slug : undefined) ?? id ?? "";
  const [result, setResult] = React.useState<BulkResult>();
  const [pending, startTransition] = React.useTransition();
  /*
   * R24.6. Narrowing the list is a round trip, so it says so.
   *
   * Its own transition rather than the one the bulk actions use: a filter
   * being applied should not grey out a selection somebody is still building,
   * and a tag being written should not make the filter panel look busy.
   */
  const [narrowingNow, startNarrowing] = React.useTransition();

  // The selection only ever held rows on screen, so leaving the page drops it.
  React.useEffect(() => setSelected([]), [page]);

  const q = params.get("q") ?? "";
  const [search, setSearch] = React.useState(q);
  React.useEffect(() => setSearch(q), [q]);

  /* R2.14. Which column the list is in, and which way. */
  const sortNow = {
    by: params.get("sort") ?? "name",
    dir: params.get("dir") === "desc" ? "desc" as const : "asc" as const,
  };

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
      startNarrowing(() => {
        router.replace(`/members?${next.toString()}`, { scroll: false });
      });
    },
    [params, router],
  );

  /*
   * R2.14. Pressing a heading sorts by it. Pressing the one already sorted
   * turns it over, which is what every table a church has ever used does.
   */
  const setSort = (by: string) => {
    const same = sortNow.by === by;
    const dir = same && sortNow.dir === "asc" ? "desc" : "asc";
    setParam({
      sort: by === "name" ? undefined : by,
      dir: dir === "asc" ? undefined : dir,
    });
  };

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

  /*
   * R2.4. Putting one person back, from the row they are on.
   *
   * The archived view is where somebody goes to undo an archive, so the action
   * is on the row rather than three clicks away on each person's own page.
   */
  const restore = (id: string) => {
    const data = new FormData();
    data.set("archived", "0");
    data.append("ids", id);

    setResult(undefined);
    startTransition(async () => {
      const outcome = await bulkArchive(data);
      setResult(outcome);
      if (!outcome.error) router.refresh();
    });
  };

  /* The checkboxes and the bar they feed are about the live directory: every
     action on that bar reads as something done to a person the church is still
     in touch with. */
  const picking = canEdit && !putAway;

  /* The archived view is reached through `show`, so that one does not count as
     narrowing while it is on. */
  /*
   * Whether anything is narrowing the list, which decides whether an empty
   * screen reads "nobody matches" or "no one here yet". Four of the nine
   * were counted, so filtering by a joined date down to nothing told a
   * church with two hundred members that it had none.
   */
  const filtersOn =
    ["q", "status", "tag", "has", "joined", "group", "serving", "seen", "missing", "list"]
      .some((key) => params.get(key))
    || (!putAway && Boolean(params.get("show")));
  /* R19.8. Named, so an unfiltered directory asks for its members rather
     than falling through to the whole archive. */
  const exportHref = `/api/export?view=members${params.toString() ? `&${params}` : ""}`;

  // What the Filter button counts, so "Filter · 2" says how much is narrowing
  // the list. Search sits outside it, in its own box. Status and tags each
  // count once however many answers they hold: it is one question.
  const narrowing =
    (params.get("status") ? 1 : 0) + (params.get("tag") ? 1 : 0)
    + (params.get("joined") ? 1 : 0) + (params.get("missing") === "1" ? 1 : 0)
    + (params.get("group") ? 1 : 0) + (params.get("serving") ? 1 : 0)
    + (params.get("seen") ? 1 : 0) + (params.get("has") ? 1 : 0);

  const first = (page - 1) * perPage + 1;
  const upto = Math.min(page * perPage, matching);

  return (
    <>
      <nav
        aria-label={t("directory.views")}
        className="grid w-fit max-w-full grid-flow-col auto-cols-fr items-center gap-1 rounded-xl border border-line bg-sunken p-1"
      >
        <Link
          href="/members"
          aria-current={!putAway ? "page" : undefined}
          className={cn(
            "inline-flex min-h-9 items-center justify-center rounded-lg px-4 text-center text-[13px] font-medium transition-colors",
            !putAway
              ? "bg-primary text-primary-fg shadow-sm"
              : "text-fg-muted hover:bg-surface hover:text-fg",
          )}
        >
          {t("members.title")}
        </Link>
        {canArchive ? (
          <Link
            href="/members?show=archived"
            aria-current={putAway ? "page" : undefined}
            className={cn(
              "inline-flex min-h-9 items-center justify-center rounded-lg px-4 text-center text-[13px] font-medium transition-colors",
              putAway
                ? "bg-primary text-primary-fg shadow-sm"
                : "text-fg-muted hover:bg-surface hover:text-fg",
            )}
          >
            {t("members.archived.title")}
          </Link>
        ) : null}
      </nav>

      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3">
        {/* Live-directory tools stay off the archived view. The search box
            remains available there, because archived members are looked up too. */}
        {putAway ? null : (
        <div className="flex flex-wrap items-center gap-2">
        {/* The box that narrows the list leads: it is what somebody reaches
            for first, and the marks beside it are what they reach for after. */}
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder={t("directory.searchPlaceholder")}
          className="min-w-[220px] max-w-[320px] flex-1 [&_input]:border-line [&_input]:shadow-none hover:[&_input]:border-line-strong"
        />

        {/* R2.14. The other question a long list raises, asked in the same
            panel and answered with the same press. It leads the marks. */}
        {/* R1.14. The lists this church keeps, beside the box that searches
            them: both are ways into the directory by name. */}
        <OpenList lists={lists} />

        {/* R2.14. The headings sort by surname, household and status. This
            keeps the two orderings no column offers, by first name and by when
            somebody was added, and it is where a reader goes for those. */}
        <SortDrawer
          value={params.get("sort") ?? "name"}
          dir={params.get("dir") === "desc" ? "desc" : "asc"}
          busy={narrowingNow}
          options={SORTS}
          done={t("directory.sort")}
          onApply={({ sort, dir }) =>
            setParam({
              sort: sort === "name" ? undefined : sort,
              dir: dir === "asc" ? undefined : dir,
            })}
        />

        <DirectoryFilters
          tags={tags}
          params={params}
          setParam={setParam}
          onClear={() =>
            startNarrowing(() => router.replace("/members", { scroll: false }))
          }
          narrowing={narrowing}
          busy={narrowingNow}
          compact
        />

        {/* R1.14. The way to keep this one. Offered only while something is
            narrowing the list: the whole directory saved under a name is the
            screen it is already on. */}
        {canEdit && !viewing && (narrowing > 0 || q !== "") ? (
          <SaveView params={params} />
        ) : null}

        {/* R19.x, R24.6. The server builds this one, which takes a moment on
            a directory of any size, so it is asked for in the page and the
            Working panel holds the screen until the file lands. */}
        <FileDownload
          href={exportHref}
          file="members.csv"
          label={t("directory.exporting")}
          name={t("directory.exportView")}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-[13px] font-medium text-fg hover:bg-sunken"
        >
          <Download /> {t("directory.exportView")}
        </FileDownload>

        <span className="flex-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" className="relative shrink-0">
              {t("action.more")}
              {canArchive && duplicates > 0 ? (
                <span className="absolute -right-2 -top-2 grid min-h-5 min-w-5 place-items-center rounded-full border-2 border-surface bg-danger px-1 text-[11px] font-semibold leading-none text-white tabular-nums">
                  {duplicates}
                </span>
              ) : null}
              <ChevronDown aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canArchive ? (
              <DropdownMenuItem asChild>
                <Link href="/members/duplicates">
                  <Copy /> {t("merge.title")}
                  {duplicates > 0 ? (
                    <span className="ml-auto rounded-full bg-danger-soft px-1.5 text-[11px] font-semibold text-danger-text">
                      {duplicates}
                    </span>
                  ) : null}
                </Link>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem asChild>
              <Link href="/members/celebrations"><Cake /> {t("celebrations.open")}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/members/print" target="_blank"><Printer /> {t("members.printAll")}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/members/email"><Send /> {t("send.title")}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/members/mailer"><FileText /> {t("post.title")}</Link>
            </DropdownMenuItem>
            {canEdit ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/members/import"><Upload /> {t("import.title")}</Link>
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* R24.6. The action this directory exists to support stays at the end
            of the row, beside its list tools. */}
        {canEdit ? (
          <Button asChild className="shrink-0">
            <Link href={addMemberHref}>
              <Plus /> {t("members.add")}
            </Link>
          </Button>
        ) : null}

        </div>
        )}

        {/* An archived directory keeps the search box. */}
        {putAway ? (
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder={t("directory.searchPlaceholder")}
          />
        ) : null}
      </div>

      {result?.error ? <Banner tone="danger">{result.error}</Banner> : null}
      {result && !result.error && result.changed !== undefined ? (
        <Said
          message={t("directory.bulkDone", { count: result.changed })}
          onClose={() => setResult(undefined)}
        />
      ) : null}

      {/* R1.14. Which list is being read, and the way back to everybody. */}
      {viewing ? <ListBar list={viewing} canEdit={canEdit} /> : null}

      {selected.length > 0 && picking ? (
        <SelectionBar
          lists={lists}
          count={selected.length}
          ids={selected}
          tags={tags}
          groups={groups}
          mergeHref={
            canArchive && selected.length === 2
              /* R2.8. Named rather than numbered: a church sending this to a
                 colleague should be sending something it can read. */
              ? `/members/duplicates?a=${slugOf(selected[0])}&b=${slugOf(selected[1])}`
              : null
          }
          pending={pending}
          onTakeOff={
            viewing?.kind === "static"
              ? () => act(takeOffList, { listId: viewing.id })
              : undefined
          }
          onClear={() => setSelected([])}
          onTag={(tagId, on) => act(bulkTag, { tagId, on: on ? "1" : "0" })}
          onGroup={(groupId) => act(bulkAddToGroup, { groupId })}
          onStatus={(status) => act(bulkStatus, { status })}
        />
      ) : null}

      {rows.length === 0 ? (
        <Empty
          icon={filtersOn ? "noResults" : "members"}
          title={
            filtersOn
              ? t("directory.noResults.title")
              : putAway
                ? t("members.archived.none")
                : t("members.empty.title")
          }
          body={
            filtersOn
              ? t("directory.noResults.body")
              : putAway
                ? undefined
                : t("members.empty.body")
          }
          action={
            filtersOn ? (
              <Button variant="secondary" onClick={() => router.replace("/members", { scroll: false })}>
                <X /> {t("directory.clear")}
              </Button>
            ) : canEdit && !putAway ? (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button asChild>
                  <Link href={addMemberHref}>
                    <Plus /> {t("members.add")}
                  </Link>
                </Button>
                <Button variant="secondary" asChild>
                  <Link href={"/members/import"}>
                    <Upload /> {t("import.title")}
                  </Link>
                </Button>
              </div>
            ) : undefined
          }
        />
      ) : (
        /* R24.6. The rows go quiet while the next set is on its way, so a
           press that takes a moment is never a screen that looks untouched. */
        <div
          id="directory-rows"
          aria-busy={narrowingNow}
          className={cn(
            "scroll-mt-20 transition-opacity duration-instant",
            narrowingNow && "pointer-events-none opacity-55",
          )}
        >
        {/* R24.6. A phone reads the same rows as a list of people to tap into.
            Seven columns inside a sideways scroller is a comparison tool, and
            nobody compares columns on a 390px screen: they look somebody up. */}
        <ul className="flex flex-col gap-2 sm:hidden">
          {rows.map((p) => (
            <li
              key={p.id}
              className="relative flex items-center gap-3 rounded-lg border border-line bg-surface p-3 data-[selected]:bg-primary-soft"
              data-selected={selected.includes(p.id) || undefined}
            >
              {picking ? (
                <Checkbox
                  checked={selected.includes(p.id)}
                  onCheckedChange={() => toggle(p.id)}
                  aria-label={t("directory.select", { name: p.displayName })}
                  /* The box stays 20px to the eye and 40px to a thumb, and it
                     sits over the stretched link rather than under it. */
                  className="relative z-10 before:absolute before:-inset-2.5 before:content-['']"
                />
              ) : null}

              <Avatar
                name={p.displayName}
                src={p.photoUrl}
                id={p.id}
                className="size-10 text-[13px] font-semibold"
              />

              <span className="flex min-w-0 flex-1 flex-col gap-1">
                {/* The whole card opens them. The name is the link under it. */}
                <Link
                  href={memberHref(p.slug)}
                  className="truncate font-medium text-fg after:absolute after:inset-0 after:content-['']"
                >
                  {p.displayName}
                </Link>
                <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <StatusPill status={p.lifecycleStatus} />
                  {p.householdName ? (
                    <span className="min-w-0 truncate text-[13px] text-fg-muted">
                      {p.householdName}
                    </span>
                  ) : null}
                </span>
                {reachOn(p) ? (
                  <span className="min-w-0 truncate text-[13px] text-fg-muted">{reachOn(p)}</span>
                ) : null}
                {p.tags.length > 0 ? <TagChips tags={p.tags} /> : null}
              </span>

              {putAway && canArchive ? (
                <IconButton
                  label={t("person.restore")}
                  variant="ghost"
                  disabled={pending}
                  onClick={() => restore(p.id)}
                  className="relative z-10 shrink-0"
                >
                  <ArchiveRestore />
                </IconButton>
              ) : null}
            </li>
          ))}
        </ul>

        <ResizableTable
          /* Its own remembered widths: the archived view trades the checkbox
             column for the one that puts somebody back, and a set of widths
             held against a different run of columns lands on the wrong ones. */
          id={putAway ? "directory.archived" : "directory"}
          className="hidden rounded-lg border border-line bg-surface sm:block"
        >
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="text-left text-[12px] font-semibold text-fg">
                {picking ? (
                  <th className="w-10 border-b border-line px-4 py-3 font-medium">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? "indeterminate" : false}
                      onCheckedChange={toggleAll}
                      aria-label={t("directory.selectAll")}
                    />
                  </th>
                ) : null}
                {/* R2.14. The headings are the sort. The query has taken a
                    column and a direction since it was written; until now the
                    only way to reach them was a drawer behind a mark, so a
                    reader looking at a column of surnames had no way to guess
                    that the surnames could be ordered. */}
                <SortColumn now={sortNow} set={setSort} by="name">{t("members.column.person")}</SortColumn>
                <SortColumn now={sortNow} set={setSort} by="household">{t("members.column.household")}</SortColumn>
                <SortColumn now={sortNow} set={setSort} by="status">{t("members.column.status")}</SortColumn>
                <th className="border-b border-line px-4 py-3 font-medium">{t("members.column.tags")}</th>
                <th className="border-b border-line px-4 py-3 font-medium">{t("members.column.email")}</th>
                <th className="border-b border-line px-4 py-3 font-medium">{t("members.column.phone")}</th>
                {putAway && canArchive ? (
                  <th className="w-12 border-b border-line px-4 py-3 font-medium">
                    <span className="sr-only">{t("person.restore")}</span>
                  </th>
                ) : null}
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
                  onClick={() => router.push(memberHref(p.slug))}
                  // A picked row is tinted, so the selection is visible while
                  // the eye is on the names rather than on the checkboxes.
                  className="cursor-pointer hover:bg-canvas data-[selected]:bg-primary-soft"
                  data-selected={selected.includes(p.id) || undefined}
                >
                  {picking ? (
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
                      href={memberHref(p.slug)}
                      className="flex items-center gap-2.5 font-medium text-fg"
                    >
                      <Avatar name={p.displayName} src={p.photoUrl} id={p.id} size="sm" className="size-7 text-[12px] font-semibold" />
                      <span className="truncate">{p.displayName}</span>
                    </Link>
                  </td>
                  <td className="border-b border-sunken px-4 py-2.5 text-fg-muted">
                    {p.householdName ?? EMPTY}
                  </td>
                  {/* The press stays here. The row opens the record, and
                      choosing a status was opening it too. */}
                  <td
                    className="border-b border-sunken px-4 py-2.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <StatusCell
                      id={p.id}
                      status={p.lifecycleStatus}
                      canEdit={canEdit}
                      onChanged={() => router.refresh()}
                    />
                  </td>
                  <td className="border-b border-sunken px-4 py-2.5 text-[13px] text-fg-muted">
                    {p.tags.length > 0 ? <TagChips tags={p.tags} /> : EMPTY}
                  </td>
                  <td className="border-b border-sunken px-4 py-2.5 text-[13px] text-fg-muted">
                    {p.primaryEmail ?? EMPTY}
                  </td>
                  <td className="border-b border-sunken px-4 py-2.5 text-[13px] text-fg-muted tabular-nums">
                    {p.primaryPhone ?? EMPTY}
                  </td>
                  {putAway && canArchive ? (
                    <td
                      className="border-b border-sunken px-4 py-2.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <IconButton
                        label={t("person.restore")}
                        variant="ghost"
                        disabled={pending}
                        onClick={() => restore(p.id)}
                      >
                        <ArchiveRestore />
                      </IconButton>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </ResizableTable>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[13px] text-fg-muted">
          {matching === 0
            ? t("directory.none")
            : t("directory.showing", {
                range: t("directory.range", { shown: upto - first + 1, matching }),
              })}
        </span>
        <Pages
          page={page}
          last={Math.max(1, Math.ceil(matching / perPage))}
          onPage={(n) => setParam({ page: n <= 1 ? undefined : String(n) })}
          anchor="directory-rows"
        />
      </div>
    </>
  );
}

/** A 34px secondary control. The row of them above the list is all this shape. */
/** The shape every mark on the tool row wears, link or button. */
/*
 * R24.6. A tool on this row is a mark, not a worded button.
 *
 * Eight of them with their words on ran the row onto a second line and pushed
 * the thing the screen is for about with it. Each carries its words in a
 * tooltip and as its accessible name, which is what `IconButton` does for a
 * row action everywhere else in the product.
 */
/**
 * R2.14. What a church may put its directory in the order of.
 *
 * Surname leads because that is how a church's own index is kept. The words
 * for the direction follow the field: oldest and newest read right for a date
 * and wrong for a name.
 */
const SORTS = [
  {
    value: "name",
    label: t("directory.sort.surname"),
    rising: t("directory.sort.aToZ"),
    falling: t("directory.sort.zToA"),
  },
  {
    value: "firstName",
    label: t("directory.sort.firstName"),
    rising: t("directory.sort.aToZ"),
    falling: t("directory.sort.zToA"),
  },
  {
    value: "household",
    label: t("directory.sort.household"),
    rising: t("directory.sort.aToZ"),
    falling: t("directory.sort.zToA"),
  },
  {
    value: "status",
    label: t("directory.sort.status"),
    rising: t("directory.sort.aToZ"),
    falling: t("directory.sort.zToA"),
  },
  {
    value: "added",
    label: t("directory.sort.added"),
    rising: t("directory.sort.oldest"),
    falling: t("directory.sort.newest"),
  },
];

/** The one way to reach somebody, for the card a phone reads. */
const reachOn = (row: Row): string | null => row.primaryEmail ?? row.primaryPhone ?? null;

/**
 * One tinted pill, in a hue that means something. A status and a tag sit beside
 * each other on a row, so they are the same object in two colours rather than
 * two designs.
 */
function HuePill({ hue, children }: { hue: Hue; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex max-w-full items-center truncate rounded-full px-2 py-0.5 text-[12px] font-medium"
      style={{ background: `var(--hue-${hue}-tint)`, color: `var(--hue-${hue}-key)` }}
    >
      {children}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  return <HuePill hue={(STATUS_HUE[status] ?? "clay") as Hue}>{lifecycleLabel(status)}</HuePill>;
}

/**
 * R2.2, R2.14. The status, changed where it is read.
 *
 * A visitor who comes back and is now a regular is the most ordinary edit a
 * church makes, and it meant opening the record, finding the field, choosing,
 * saving and coming back to the list. On a row it is two presses.
 *
 * Only for whoever may edit. For everybody else the pill is the pill, because
 * a control that refuses on press is worse than no control.
 */
function StatusCell({
  id,
  status,
  canEdit,
  onChanged,
}: {
  id: string;
  status: string;
  canEdit: boolean;
  onChanged: () => void;
}) {
  const [busy, start] = React.useTransition();
  const [error, setError] = React.useState<string>();
  /*
   * R24.6. The row says the new status at once.
   *
   * The write lands and the server revalidates, but the list is a server
   * render and the new rows take a moment to arrive, so the pill went on
   * reading Visitor after a press that had already worked. A press that
   * changes nothing on screen reads as a press that failed, and the next
   * thing anybody does is press it again.
   */
  const [shown, setShown] = React.useState(status);
  React.useEffect(() => setShown(status), [status]);

  if (!canEdit || status === "archived") return <StatusPill status={status} />;

  const choose = (next: string) => {
    if (next === shown) return;
    const was = shown;
    setShown(next);
    setError(undefined);
    start(async () => {
      const body = new FormData();
      body.set("ids", id);
      body.set("status", next);
      const result = await bulkStatus(body);
      if (result.error) {
        /* Back to what the church's records actually say. */
        setShown(was);
        setError(result.error);
        return;
      }
      onChanged();
    });
  };

  return (
    <DropdownMenu>
      <Tooltip content={error ?? t("directory.bulkStatus")}>
        <DropdownMenuTrigger
          disabled={busy}
          aria-busy={busy}
          className="inline-flex cursor-pointer items-center gap-1 rounded-full disabled:cursor-wait"
          aria-label={t("directory.bulkStatus")}
        >
          <StatusPill status={shown} />
          {/* R24.6. The write goes to the server, so it says so while it is
              gone. The pill has already changed, and a changed pill with
              nothing else happening does not say whether it is saved. */}
          {busy
            ? <Spinner className="size-3.5 shrink-0 text-fg-subtle" />
            : <ChevronDown aria-hidden className="size-3.5 shrink-0 text-fg-subtle" />}
        </DropdownMenuTrigger>
      </Tooltip>
      <DropdownMenuContent align="start">
        {lifecycleOptions().map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => choose(option.value)}
            aria-current={option.value === shown ? "true" : undefined}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * R2.14, R24.6. A heading that sorts, in this table's own padding.
 *
 * The mark is always drawn, greyed until the column is the sorted one, so a
 * reader can see which columns can be ordered without hovering each in turn.
 */
function SortColumn({
  by,
  now,
  set,
  children,
}: {
  by: string;
  now: { by: string; dir: "asc" | "desc" };
  set: (by: string) => void;
  children: React.ReactNode;
}) {
  const on = now.by === by;
  const Mark = on ? (now.dir === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown;
  return (
    <th
      aria-sort={on ? (now.dir === "asc" ? "ascending" : "descending") : "none"}
      className="border-b border-line px-4 py-3 font-medium"
    >
      <button
        type="button"
        onClick={() => set(by)}
        className="-mx-1 flex cursor-pointer items-center gap-1.5 rounded-md px-1 py-0.5 font-semibold text-fg transition-colors duration-instant hover:text-primary"
      >
        {children}
        <Mark aria-hidden className={cn("size-3.5 shrink-0", on ? "text-primary" : "text-fg-subtle")} />
      </button>
    </th>
  );
}

const TAGS_ON_A_ROW = 3;

/**
 * R2.14. The tags somebody carries, in the hue each one was given.
 *
 * Three at most on a row. A tag is read at a glance, and a person with nine of
 * them turns one cell into a paragraph that pushes every other row down, so the
 * rest are counted and named in the tooltip.
 */
function TagChips({ tags }: { tags: { name: string; hue: string }[] }) {
  const shown = tags.slice(0, TAGS_ON_A_ROW);
  const rest = tags.slice(TAGS_ON_A_ROW);
  return (
    <span className="flex flex-wrap items-center gap-1">
      {shown.map((tag) => (
        <HuePill key={tag.name} hue={tag.hue as Hue}>
          {tag.name}
        </HuePill>
      ))}
      {rest.length > 0 ? (
        <Tooltip content={rest.map((tag) => tag.name).join(", ")}>
          <span tabIndex={0} className="text-[12px] font-medium text-fg-muted">
            {plural("members.tags.more", rest.length)}
          </span>
        </Tooltip>
      ) : null}
    </span>
  );
}



/**
 * R2.14. The filter panel.
 *
 * The same shape as the one on giving, on events and on the group finder: a
 * question to a row, a dropdown where the answer is one of a set and a multi
 * select where it is any of them. Rows of chips grew past the panel as the
 * filters grew, and nothing on the row said whether two of them narrowed the
 * list or widened it.
 *
 * Status and tags take several answers, because "members and regulars" and
 * "choir or welcome team" are each one question. The rest are answers that
 * exclude each other, so they are dropdowns.
 */
function DirectoryFilters({
  tags,
  params,
  setParam,
  onClear,
  narrowing,
  busy,
  compact,
}: {
  tags: TagOption[];
  params: URLSearchParams;
  setParam: (changes: Record<string, string | undefined>) => void;
  onClear: () => void;
  narrowing: number;
  /** R24.6. Whether the rows behind the panel are still on their way. */
  busy: boolean;
  /** R24.6. Drawn as a mark, for a row that already carries several. */
  compact?: boolean;
}) {
  /** What the address is asking for, as the panel's own fields. */
  const asFields = React.useCallback(
    () => ({
      status: params.get("status") ?? "",
      tag: params.get("tag") ?? "",
      joined: params.get("joined") ?? "",
      group: params.get("group") ?? "",
      serving: params.get("serving") ?? "",
      seen: params.get("seen") ?? "",
      has: params.get("has") ?? "",
      missing: params.get("missing") ?? "",
    }),
    [params],
  );

  /*
   * R24.6. Nothing moves until Show is pressed.
   *
   * The same rule the giving filter follows, and here it is also the only
   * correct one: every answer used to be worked out from the address, and the
   * address lags a press behind, so ticking a second status replaced the
   * first instead of joining it.
   */
  const [draft, setDraft] = React.useState(asFields);

  /*
   * R24.6. Whether each answer goes straight to the list behind the panel.
   *
   * Off by default: a list that re-sorts itself under somebody halfway
   * through choosing is a list they have to find their place in again. It is
   * remembered per browser, because somebody who prefers watching the list
   * move prefers it every time.
   */
  const [live, setLive] = React.useState(false);
  React.useEffect(() => {
    try {
      setLive(window.localStorage.getItem(LIVE_FILTER) === "1");
    } catch {
      // A private window refuses. The panel holds its answers, which is the
      // behaviour somebody who has never chosen would expect anyway.
    }
  }, []);

  const apply = (fields: ReturnType<typeof asFields>) =>
    setParam({
      status: fields.status || undefined,
      tag: fields.tag || undefined,
      joined: fields.joined || undefined,
      group: fields.group || undefined,
      serving: fields.serving || undefined,
      seen: fields.seen || undefined,
      has: fields.has || undefined,
      missing: fields.missing || undefined,
    });

  const set = (key: keyof ReturnType<typeof asFields>, value: string) =>
    setDraft((was) => {
      const next = { ...was, [key]: value };
      if (live) apply(next);
      return next;
    });

  const list = (key: "status" | "tag") =>
    draft[key].split(",").map((one) => one.trim()).filter(Boolean);

  /**
   * One of a set, with "Any" standing for no filter.
   *
   * The sentinel is a word rather than an empty string: a Select item with no
   * value is not a value, so the control came up blank instead of saying Any.
   */
  const choice = (
    key: "joined" | "group" | "serving" | "seen" | "has",
    label: string,
    values: readonly string[],
    labelOf: (value: string) => string,
  ) => (
    <div key={key} className="flex flex-col gap-1.5">
      <span className="text-label text-fg">{label}</span>
      <Select value={draft[key] || ANY} onValueChange={(next) => set(key, next === ANY ? "" : next)}>
        <SelectTrigger aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {values.map((one) => (
            <SelectItem key={one} value={one}>{labelOf(one)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const summary = (picks: { label: string }[]) =>
    picks.length > 2
      ? t("find.chosen", { count: picks.length })
      : picks.map((one) => one.label).join(", ");

  return (
    <FilterDrawer
      title={t("directory.filterTitle")}
      narrowing={narrowing}
      busy={busy}
      compact={compact}
      onClear={() => {
        setDraft({
          status: "", tag: "", joined: "", group: "",
          serving: "", seen: "", has: "", missing: "",
        });
        onClear();
      }}
      onOpen={() => setDraft(asFields())}
      onApply={() => apply(draft)}
      /* No count on it. The server narrows the list, so a figure here is the
         one from before the last answer. */
      done={t("directory.filter")}
    >
      <div className="flex flex-col gap-1.5">
        <span className="text-label text-fg">{t("directory.filterStatus")}</span>
        <MultiSelect
          label={t("directory.filterStatus")}
          options={LIFECYCLE_VALUES.map((one) => ({ value: one, label: lifecycleLabel(one) }))}
          value={list("status")}
          onChange={(next) => set("status", next.join(","))}
          summary={summary}
        />
      </div>

      {tags.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-label text-fg">{t("directory.filterTag")}</span>
          <MultiSelect
            label={t("directory.filterTag")}
            options={tags.map((one) => ({ value: one.slug ?? one.id, label: one.name }))}
            value={list("tag")}
            onChange={(next) => set("tag", next.join(","))}
            summary={summary}
          />
        </div>
      ) : null}

      {choice("joined", t("directory.filterJoined"), [ANY, "year", "months", "five", "earlier", "none"],
        (one) => (one === ANY ? t("directory.anyOf") : t(`directory.joined.${one}` as never)))}

      {choice("group", t("directory.filterGroup"), [ANY, "any", "none"],
        (one) => (one === ANY ? t("directory.anyOf") : t(`directory.group.${one}` as never)))}

      {choice("serving", t("directory.filterServing"), [ANY, "any", "none"],
        (one) => (one === ANY ? t("directory.anyOf") : t(`directory.serving.${one}` as never)))}

      {choice("seen", t("directory.filterSeen"), [ANY, "recent", "absent"],
        (one) => (one === ANY ? t("directory.anyOf") : t(`directory.seen.${one}` as never)))}

      {/* R2.4. How a church can reach them, which is the half of a directory
          that starts a conversation. */}
      {choice("has", t("directory.filterContact"), [ANY, "email", "noEmail", "phone", "noPhone"],
        (one) => (one === ANY ? t("directory.anyOf") : t(`directory.has.${one}` as never)))}

      <label className="flex min-h-[var(--d-tap)] cursor-pointer items-center gap-2.5">
        <Checkbox
          checked={draft.missing === "1"}
          onCheckedChange={(on) => set("missing", on ? "1" : "")}
        />
        <span className="text-[length:var(--d-text-body)] text-fg">{t("directory.missing")}</span>
      </label>

      <label className="flex min-h-[var(--d-tap)] cursor-pointer items-center gap-2.5 border-t border-line pt-4">
        <Switch
          checked={live}
          onCheckedChange={(on) => {
            setLive(on);
            try {
              window.localStorage.setItem(LIVE_FILTER, on ? "1" : "0");
            } catch {
              // It holds for this sitting either way.
            }
            if (on) apply(draft);
          }}
        />
        <span className="text-[length:var(--d-text-body)] text-fg">
          {t("directory.liveUpdate")}
        </span>
      </label>
    </FilterDrawer>
  );
}

function SelectionBar({
  lists,
  count,
  ids,
  tags,
  groups,
  mergeHref,
  pending,
  onTakeOff,
  onClear,
  onTag,
  onGroup,
  onStatus,
}: {
  lists: ListOption[];
  count: number;
  ids: string[];
  tags: TagOption[];
  groups: GroupOption[];
  /** R2.8. Set when exactly two are picked. */
  mergeHref: string | null;
  pending: boolean;
  /** R1.14. Set only while a picked list is open, since a rule list has none. */
  onTakeOff?: () => void;
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
        // Above the phone tab bar, and 24px off the floor once there is none.
        "fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-1/2 z-30 md:bottom-6",
        // Nothing on the bar is squeezed: it scrolls instead.
        "flex max-w-[calc(100vw-2rem)] -translate-x-1/2 [&>*]:shrink-0",
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

      {/* R1.14. Onto a list the church keeps, or a new one named here. */}
      <AddToList lists={lists} ids={ids} onDone={onClear} />

      {/* R1.14. Off the list being read. Their records are untouched. */}
      {onTakeOff ? (
        <Button
          variant="ghost"
          className="min-h-9 rounded-full px-2.5 text-[13px]"
          onClick={onTakeOff}
        >
          <ListMinus /> {t("lists.takeOff")}
        </Button>
      ) : null}

      <FileDownload
        href={`/api/export?ids=${ids.join(",")}`}
        file="members.csv"
        label={t("directory.exporting")}
        className="flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium text-fg hover:bg-sunken [&_svg]:size-4"
      >
        <Download /> {t("directory.bulkExport")}
      </FileDownload>

      {/* R2.8. Two members picked is the question "are these the same person",
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
  const [open, setOpen] = React.useState(false);
  const [channel, setChannel] = React.useState("email");

  /* The channel is chosen for this selection, so a different one starts fresh. */
  const close = (next: boolean) => {
    setOpen(next);
    if (!next) setChannel("email");
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="min-h-9 rounded-full px-2.5 text-[13px]">
          <Mail /> {t("directory.bulkMessage")}
        </Button>
      </DialogTrigger>
      <DialogContent title={plural("directory.messageTitle", count)} closeLabel={t("common.close")}>
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
  list,
  canEdit,
}: {
  list: { id: string; name: string; kind: "static" | "rule" };
  canEdit: boolean;
}) {
  const router = useRouter();
  const [renaming, setRenaming] = React.useState(false);
  const renameForm = React.useId();
  const renameFull = useAnswered(renameForm, renaming);
  const [archiving, setArchiving] = React.useState(false);
  const [failed, setFailed] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-3">
      {failed ? <Banner tone="danger">{failed}</Banner> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <ListFilter className="size-4 shrink-0 text-fg-muted" aria-hidden />
          <span className="truncate text-title text-fg">{list.name}</span>
        </span>

        {/* R24.11. The three things done to a list, as marks. Each carries its
            words through the label, which is the tooltip and the accessible
            name both. */}
        <span className="flex shrink-0 items-center gap-1">
          {canEdit ? (
            <>
              <IconButton label={t("lists.rename")} onClick={() => setRenaming(true)}>
                <Pencil />
              </IconButton>
              <IconButton label={t("lists.archive")} onClick={() => setArchiving(true)}>
                <Archive />
              </IconButton>
            </>
          ) : null}
          <Tooltip content={t("directory.clear")}>
            <Link
              href={"/members"}
              aria-label={t("directory.clear")}
              className="inline-flex size-[var(--d-tap)] items-center justify-center rounded-[var(--d-radius-control)] text-fg-muted hover:bg-sunken hover:text-fg [&_svg]:size-[var(--d-icon)]"
            >
              <X />
            </Link>
          </Tooltip>
        </span>
      </div>

      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent title={t("lists.renameTitle", { name: list.name })} closeLabel={t("common.close")}>
          <form
            id={renameForm}
            noValidate
            action={(data) =>
              startTransition(async () => {
                const result = await rename(list.id, String(data.get("name") ?? ""));
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
              <Button type="submit" loading={pending} disabled={!renameFull}>{t("action.save")}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={archiving} onOpenChange={setArchiving}>
        <DialogContent alert title={t("lists.archiveTitle", { name: list.name })}>
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
                  const result = await archiveList(list.id, true);
                  setFailed(result.error);
                  if (!result.error) router.push("/members");
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

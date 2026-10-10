"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FilterDrawer, SortDrawer } from "@/components/filter-drawer";
import { MultiSelect } from "@/components/multi-select";
import { ResizableTable } from "@/components/resizable-columns";
import { Download as FileDownload } from "@/components/download";
import { X, Archive, ArchiveRestore, Upload, Download, Plus, CircleDot, Mail, Merge, ListFilter, Pencil, Copy, Cake, Printer, Tag, CheckCircle2, ListMinus } from "lucide-react";
import {
  Avatar, Button, Field, Input, Textarea, Checkbox, Banner, HueDot, Tooltip,
  IconButton,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Switch,
  Dialog, DialogTrigger, DialogContent, DialogFooter, DialogClose,
  Tabs, TabsList, TabsTrigger,
  cn, type Hue,
} from "@connectapp/ui";
import { t, plural } from "@connectapp/i18n";
import { Said } from "@/components/said";
import { Empty } from "@/components/empty";
import { LIFECYCLE_VALUES, lifecycleLabel } from "@/lib/person-input";
import { bulkArchive, bulkStatus, bulkTag, bulkAddToGroup, type BulkResult } from "./bulk-actions";
import { Pages } from "@/components/pages";
import { useAnswered } from "@/components/form-actions";
import { rename, archiveList, takeOffList } from "./list-actions";
import { SaveView, OpenList, AddToList } from "./saved-lists";
import { SearchField } from "@/components/search-field";

export interface ListOption {
  id: string;
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
  /** R2.14. The tag names, for the column the design gives them. */
  tagNames: string[];
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
  church,
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
}: {
  church: string;
  /** R2.4. The archived view: the same list, holding the people put away. */
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
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [selected, setSelected] = React.useState<string[]>([]);
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
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      });
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

  /*
   * R2.4. Putting one person back, from the row they are on.
   *
   * The archived view is where somebody goes to undo an archive, so the action
   * is on the row rather than three clicks away on each person's own page.
   */
  const restore = (id: string) => {
    const data = new FormData();
    data.set("church", church);
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
  const exportHref = `/api/export?church=${church}&${params.toString()}`;

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
      <div className="flex flex-col gap-3">
        {/* What you can do to the list, then the box that narrows it. The
            tools read from the left, and the thing this screen is for sits at
            the far end where the eye finishes.

            None of it is on the archived view: the filter counts are counts of
            the live directory, and importing, printing and adding somebody are
            things done to it. The search box stays, because an archived
            directory is still looked up by name. */}
        {putAway ? null : (
        <div className="flex flex-wrap items-center gap-2">
        {/* The box that narrows the list leads: it is what somebody reaches
            for first, and the marks beside it are what they reach for after. */}
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder={t("directory.searchPlaceholder")}
          className="max-w-[260px] [&_input]:border-line [&_input]:shadow-none hover:[&_input]:border-line-strong"
        />

        {/* R2.14. The other question a long list raises, asked in the same
            panel and answered with the same press. It leads the marks. */}
        {/* R1.14. The lists this church keeps, beside the box that searches
            them: both are ways into the directory by name. */}
        <OpenList church={church} lists={lists} />

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
            startNarrowing(() => router.replace(pathname, { scroll: false }))
          }
          narrowing={narrowing}
          busy={narrowingNow}
          compact
        />

        {/* R1.14. The way to keep this one. Offered only while something is
            narrowing the list: the whole directory saved under a name is the
            screen it is already on. */}
        {canEdit && !viewing && (narrowing > 0 || q !== "") ? (
          <SaveView church={church} params={params} />
        ) : null}

        {canArchive ? (
          <ToolButton href={`/duplicates?church=${church}`} label={t("merge.title")}>
            <Copy />
            {duplicates > 0 ? (
              <span
                aria-hidden
                className="absolute -top-0.5 -right-0.5 grid h-[16px] min-w-[16px] place-items-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-none text-white tabular-nums"
              >
                {duplicates}
              </span>
            ) : null}
          </ToolButton>
        ) : null}

        <ToolButton href={`/members/celebrations?church=${church}`} label={t("celebrations.open")}>
          <Cake />
        </ToolButton>

        <ToolButton
          href={`/members/print?church=${church}`}
          target="_blank"
          label={t("members.printAll")}
        >
          <Printer />
        </ToolButton>

        {/* R16.12. The other half of communication: the half that needs no
            provider and sends nothing. */}
        <ToolButton href={`/members/mailer?church=${church}`} label={t("post.title")}>
          <Mail />
        </ToolButton>

        {/* R19.x, R24.6. The server builds this one, which takes a moment on
            a directory of any size, so it is asked for in the page and the
            Working panel holds the screen until the file lands. */}
        <Tooltip content={t("directory.exportView")}>
          <span className="inline-flex">
          <FileDownload
            href={exportHref}
            file="members.csv"
            label={t("directory.exporting")}
            title={t("directory.exportFailed")}
            name={t("directory.exportView")}
            className={TOOL_SHAPE}
          >
            <Download />
          </FileDownload>
          </span>
        </Tooltip>

        {canEdit ? (
          <ToolButton href={`/import?church=${church}`} label={t("import.title")}>
            <Upload />
          </ToolButton>
        ) : null}

        <span className="flex-1" />

        {/* R24.6. The one thing this screen is for, at the far end of the row
            where the eye finishes reading it. The tools beside it are marks
            rather than worded buttons, which is what keeps the row to one
            line and this press where it was left. */}
        {canEdit ? (
          <Button asChild className="shrink-0">
            <Link href={`/members/new?church=${church}`}>
              <Plus /> {t("members.add")}
            </Link>
          </Button>
        ) : null}
        </div>
        )}

        {/* An archived directory keeps the box and nothing else: the counts
            and the tools are about the live one. */}
        {putAway ? (
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder={t("directory.searchPlaceholder")}
          />
        ) : null}
      </div>

      {result?.error ? <Banner tone="danger" title={t("import.failed")}>{result.error}</Banner> : null}
      {result && !result.error && result.changed !== undefined ? (
        <Said
          message={t("directory.bulkDone", { count: result.changed })}
          onClose={() => setResult(undefined)}
        />
      ) : null}

      {/* R1.14. Which list is being read, and the way back to everybody. */}
      {viewing ? <ListBar church={church} list={viewing} canEdit={canEdit} /> : null}

      {selected.length > 0 && picking ? (
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
              <Button variant="secondary" onClick={() => router.replace(pathname, { scroll: false })}>
                <X /> {t("directory.clear")}
              </Button>
            ) : canEdit && !putAway ? (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button asChild>
                  <Link href={`/members/new?church=${church}`}>
                    <Plus /> {t("members.add")}
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
                  href={`/members/${p.slug}?church=${church}`}
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
                <th className="border-b border-line px-4 py-3 font-medium">{t("members.column.person")}</th>
                <th className="border-b border-line px-4 py-3 font-medium">{t("members.column.household")}</th>
                <th className="border-b border-line px-4 py-3 font-medium">{t("members.column.status")}</th>
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
                  onClick={() => router.push(`/members/${p.slug}?church=${church}`)}
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
                      href={`/members/${p.slug}?church=${church}`}
                      className="flex items-center gap-2.5 font-medium text-fg"
                    >
                      <Avatar name={p.displayName} src={p.photoUrl} id={p.id} size="sm" className="size-7 text-[12px] font-semibold" />
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

const TOOL_SHAPE =
  "relative grid size-[var(--d-tap)] place-items-center rounded-md text-fg-muted"
  + " hover:bg-sunken hover:text-fg [&_svg]:size-[18px]";

function ToolButton({
  href,
  target,
  label,
  children,
}: {
  href: string;
  target?: string;
  /** What it does, for the tooltip and for whoever is listening. */
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip content={label}>
      <Link href={href} target={target} aria-label={label} className={TOOL_SHAPE}>
        {children}
      </Link>
    </Tooltip>
  );
}

/** The one way to reach somebody, for the card a phone reads. */
const reachOn = (row: Row): string | null => row.primaryEmail ?? row.primaryPhone ?? null;

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
  church,
  lists,
  viewing,
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
      <AddToList church={church} lists={lists} ids={ids} onDone={onClear} />

      {/* R16.12. Labels for whoever was ticked, which is how a church posts
          to the people it just searched for. */}
      {ids.length <= 40 ? (
        <Button asChild variant="ghost" className="min-h-9 rounded-full px-2.5 text-[13px]">
          <a
            href={`/members/print/labels?church=${church}&ids=${ids.join(",")}`}
            target="_blank"
            rel="noreferrer"
          >
            <Printer /> {t("post.title")}
          </a>
        </Button>
      ) : null}

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
        href={`/api/export?church=${church}&ids=${ids.join(",")}`}
        file="members.csv"
        label={t("directory.exporting")}
        title={t("directory.exportFailed")}
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
  const renameForm = React.useId();
  const renameFull = useAnswered(renameForm, renaming);
  const [archiving, setArchiving] = React.useState(false);
  const [failed, setFailed] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-3">
      {failed ? <Banner tone="danger" title={t("import.failed")}>{failed}</Banner> : null}

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
              href={`/members?church=${church}`}
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
              <Button type="submit" loading={pending} disabled={!renameFull}>{t("action.save")}</Button>
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
                  if (!result.error) router.push(`/members?church=${church}`);
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

"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Search, X, Archive, Upload, Download, Merge, Plus, ListFilter, BookmarkPlus, MinusCircle, Pencil } from "lucide-react";
import {
  Avatar, Badge, Button, Card, CardTitle, Field, Input, Checkbox, Banner, HueDot,
  Table, Thead, Th, Tr, Td, EmptyState,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Dialog, DialogTrigger, DialogContent, DialogFooter, DialogClose,
  cn, type Hue,
} from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import { LIFECYCLE_VALUES, lifecycleLabel } from "@/lib/person-input";
import { bulkArchive, bulkStatus, bulkTag, type BulkResult } from "./bulk-actions";
import { saveSelection, saveView, takeOffList, rename, archiveList } from "./list-actions";

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
  archived: boolean;
}

export interface TagOption {
  id: string;
  name: string;
  hue: string;
}

const STATUS_TONE: Record<string, "primary" | "accent" | "neutral" | "success"> = {
  member: "primary",
  visitor: "neutral",
  regular_attender: "neutral",
  inactive: "neutral",
};

const ANY = "__any";

/** Radix needs a value, and an empty string is not one. */
const NEW_LIST = "__new";

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
  canEdit,
  canArchive,
  page,
  perPage,
  matching,
  lists,
  viewing,
}: {
  church: string;
  rows: Row[];
  tags: TagOption[];
  canEdit: boolean;
  canArchive: boolean;
  page: number;
  perPage: number;
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

  const sort = params.get("sort") ?? "name";
  const dir = params.get("dir") ?? "asc";

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

  return (
    /* Filters down the side, the list across the rest. The list is the thing
       somebody came for, so it gets the width; the filters are read once and
       then sat beside. */
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <aside className="lg:sticky lg:top-20 lg:w-64 lg:shrink-0">
        <Toolbar
          church={church}
          search={search}
          setSearch={setSearch}
          params={params}
          setParam={setParam}
          tags={tags}
          filtersOn={filtersOn}
          onClear={() => router.replace(pathname, { scroll: false })}
          exportHref={exportHref}
          canArchive={canArchive}
          canEdit={canEdit}
          lists={lists}
          viewing={viewing}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
      {result?.error ? <Banner tone="danger" title={t("import.failed")}>{result.error}</Banner> : null}
      {result && !result.error && result.changed !== undefined ? (
        <Banner tone="success" title={t("directory.bulkDone", { count: result.changed })} />
      ) : null}

      {/* R1.14. Which list is being read, what can be done to it, and the way
          back to everybody. */}
      {viewing ? (
        <ListBar church={church} list={viewing} canEdit={canEdit} />
      ) : null}

      {selected.length > 0 && canEdit ? (
        <SelectionBar
          church={church}
          lists={lists}
          viewing={viewing}
          count={selected.length}
          ids={selected}
          tags={tags}
          canArchive={canArchive}
          mergeHref={
            canArchive && selected.length === 2
              ? `/duplicates?church=${church}&a=${selected[0]}&b=${selected[1]}`
              : null
          }
          pending={pending}
          onClear={() => setSelected([])}
          onTag={(tagId, on) => act(bulkTag, { tagId, on: on ? "1" : "0" })}
          onStatus={(status) => act(bulkStatus, { status })}
          onArchive={() => act(bulkArchive, { archived: "1" })}
        />
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          title={filtersOn ? t("directory.noResults.title") : t("people.empty.title")}
          body={filtersOn ? t("directory.noResults.body") : t("people.empty.body")}
          action={
            filtersOn ? (
              <Button variant="secondary" onClick={() => router.replace(pathname, { scroll: false })}>
                <X /> {t("directory.clear")}
              </Button>
            ) : canEdit ? (
              // Day one. The copy named two things to do and the screen offered
              // neither of them.
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
        <Table>
          <Thead>
            <Tr>
              {canEdit ? (
                <Th className="w-10">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={toggleAll}
                    aria-label={t("directory.selectAll")}
                  />
                </Th>
              ) : null}
              <SortHeader field="name" label={t("people.column.person")} sort={sort} dir={dir} setParam={setParam} />
              <SortHeader field="household" label={t("people.column.household")} sort={sort} dir={dir} setParam={setParam} />
              <SortHeader field="status" label={t("people.column.status")} sort={sort} dir={dir} setParam={setParam} />
              <Th>{t("people.column.email")}</Th>
              <Th>{t("people.column.phone")}</Th>
            </Tr>
          </Thead>
          <tbody>
            {rows.map((p) => (
              <Tr key={p.id} data-selected={selected.includes(p.id) || undefined}>
                {canEdit ? (
                  <Td>
                    <Checkbox
                      checked={selected.includes(p.id)}
                      onCheckedChange={() => toggle(p.id)}
                      aria-label={t("directory.select", { name: p.displayName })}
                    />
                  </Td>
                ) : null}
                <Td>
                  <Link
                    href={`/people/${p.id}?church=${church}`}
                    className="flex items-center gap-2.5 hover:underline"
                  >
                    <Avatar name={p.displayName} id={p.id} size="sm" />
                    <span className={p.archived ? "text-fg-muted line-through" : undefined}>
                      {p.displayName}
                    </span>
                    {p.archived ? <Badge tone="neutral">{t("people.archivedBadge")}</Badge> : null}
                  </Link>
                </Td>
                <Td className="text-fg-muted">{p.householdName ?? t("people.noHousehold")}</Td>
                <Td>
                  <Badge tone={STATUS_TONE[p.lifecycleStatus] ?? "neutral"}>
                    {lifecycleLabel(p.lifecycleStatus)}
                  </Badge>
                </Td>
                <Td className="text-fg-muted">
                  {p.primaryEmail ? (
                    <a href={`mailto:${p.primaryEmail}`} className="underline-offset-4 hover:underline">
                      {p.primaryEmail}
                    </a>
                  ) : (
                    t("people.none")
                  )}
                </Td>
                <Td data-numeric className="text-fg-muted">
                  {p.primaryPhone ? (
                    <a
                      href={`tel:${p.primaryPhone.replace(/[^+\d]/g, "")}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {p.primaryPhone}
                    </a>
                  ) : (
                    t("people.none")
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      <Pages page={page} perPage={perPage} matching={matching} setParam={setParam} />
      </div>
    </div>
  );
}

/**
 * Page controls, shown only when there is more than one page.
 *
 * The count is of everything matching rather than of this page, because that is
 * the number somebody is asking about when they glance down here.
 */
function Pages({
  page,
  perPage,
  matching,
  setParam,
}: {
  page: number;
  perPage: number;
  matching: number;
  setParam: (c: Record<string, string | undefined>) => void;
}) {
  if (matching === 0) return null;

  const last = Math.max(1, Math.ceil(matching / perPage));
  const first = (page - 1) * perPage + 1;
  const upto = Math.min(page * perPage, matching);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-caption text-fg-muted">
        {last > 1 ? t("directory.range", { first, upto, matching }) : plural("directory.matching", matching)}
      </span>

      {last > 1 ? (
        <span className="flex items-center gap-2">
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setParam({ page: page - 1 <= 1 ? undefined : String(page - 1) })}
          >
            <ChevronLeft /> {t("directory.previous")}
          </Button>
          <span className="text-caption text-fg-muted">{t("directory.page", { page, last })}</span>
          <Button
            variant="secondary"
            disabled={page >= last}
            onClick={() => setParam({ page: String(page + 1) })}
          >
            {t("directory.next")} <ChevronRight />
          </Button>
        </span>
      ) : null}
    </div>
  );
}

function SortHeader({
  field,
  label,
  sort,
  dir,
  setParam,
}: {
  field: string;
  label: string;
  sort: string;
  dir: string;
  setParam: (c: Record<string, string | undefined>) => void;
}) {
  const active = sort === field;
  return (
    <Th aria-sort={active ? (dir === "desc" ? "descending" : "ascending") : "none"}>
      <button
        type="button"
        onClick={() => setParam({ sort: field, dir: active && dir === "asc" ? "desc" : "asc" })}
        className="inline-flex items-center gap-1.5 hover:text-fg"
        aria-label={t("directory.sortBy", { field: label })}
      >
        {label}
        {active ? (
          dir === "desc" ? <ArrowDown className="size-3.5" /> : <ArrowUp className="size-3.5" />
        ) : null}
      </button>
    </Th>
  );
}

function Toolbar({
  church,
  search,
  setSearch,
  params,
  setParam,
  tags,
  filtersOn,
  onClear,
  exportHref,
  canArchive,
  canEdit,
  lists,
  viewing,
}: {
  church: string;
  search: string;
  setSearch: (v: string) => void;
  params: URLSearchParams;
  setParam: (c: Record<string, string | undefined>) => void;
  tags: TagOption[];
  filtersOn: boolean;
  onClear: () => void;
  exportHref: string;
  canArchive: boolean;
  canEdit: boolean;
  lists: ListOption[];
  viewing: { id: string; name: string; kind: "static" | "rule" } | null;
}) {
  return (
    <div className="flex flex-col gap-4">
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-label text-fg">{t("directory.search")}</span>
          <span className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3 size-4 text-fg-subtle" aria-hidden />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("directory.searchPlaceholder")}
              className="pl-9"
              type="search"
            />
          </span>
        </label>

        <Filter
          label={t("directory.filterStatus")}
          value={params.get("status") ?? ANY}
          onChange={(v) => setParam({ status: v })}
          options={LIFECYCLE_VALUES.map((v) => ({ value: v, label: lifecycleLabel(v) }))}
        />

        {tags.length > 0 ? (
          <Filter
            label={t("directory.filterTag")}
            value={params.get("tag") ?? ANY}
            onChange={(v) => setParam({ tag: v })}
            options={tags.map((t) => ({ value: t.id, label: t.name, hue: t.hue }))}
          />
        ) : null}

        <Filter
          label={t("directory.filterContact")}
          value={params.get("has") ?? ANY}
          onChange={(v) => setParam({ has: v })}
          options={[
            { value: "email", label: t("directory.hasEmail") },
            { value: "noEmail", label: t("directory.noEmail") },
            { value: "phone", label: t("directory.hasPhone") },
            { value: "noPhone", label: t("directory.noPhone") },
          ]}
        />
      </div>

      <div className="flex flex-col items-start gap-3">
        {filtersOn ? (
          <Button variant="ghost" onClick={onClear}>
            <X /> {t("directory.clear")}
          </Button>
        ) : null}

        <Link
          href={`/people?church=${church}${params.get("show") === "archived" ? "" : "&show=archived"}`}
          className="inline-flex items-center gap-1.5 text-label text-fg-muted hover:text-fg"
        >
          <Archive className="size-4" />
          {params.get("show") === "archived" ? t("people.hideArchived") : t("people.showArchived")}
        </Link>

        {/* R1.14. The filters on screen, kept. A list that answers itself is
            the same question asked again next month. */}
        {canEdit && filtersOn ? <SaveViewDialog church={church} params={params} /> : null}

        {canArchive ? (
          <span className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" asChild>
              <a href={exportHref} download>
                <Download /> {filtersOn ? t("directory.exportView") : t("directory.exportAll")}
              </a>
            </Button>
          </span>
        ) : null}
      </div>
    </Card>

    {canEdit && lists.length > 0 ? (
      <Card className="flex flex-col gap-2">
        <CardTitle>{t("lists.title")}</CardTitle>
        <ul className="flex flex-col">
          {lists.map((list) => (
            <li key={list.id}>
              <Link
                href={`/people?church=${church}&list=${list.id}`}
                aria-current={viewing?.id === list.id ? "page" : undefined}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-md px-2 py-2",
                  "text-[length:var(--d-text-body)] hover:bg-sunken",
                  viewing?.id === list.id ? "bg-sunken text-fg" : "text-fg-muted",
                )}
              >
                <span className="truncate">{list.name}</span>
                <span className="shrink-0 text-caption text-fg-subtle">
                  {list.count === null ? t("lists.kind.rule") : list.count}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    ) : null}
    </div>
  );
}

/** R1.14. Naming the view on screen, so it can be opened again. */
function SaveViewDialog({ church, params }: { church: string; params: URLSearchParams }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [failed, setFailed] = React.useState<string>();
  const [saving, startTransition] = React.useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost">
          <BookmarkPlus /> {t("lists.save")}
        </Button>
      </DialogTrigger>
      <DialogContent title={t("lists.saveTitle")} closeLabel={t("common.close")}>
        <form
          noValidate
          action={(data) => {
            data.set("church", church);
            for (const key of ["q", "status", "tag", "has", "show"]) {
              data.set(key, params.get(key) ?? "");
            }
            startTransition(async () => {
              const result = await saveView(data);
              setFailed(result.error);
              if (!result.error) {
                setOpen(false);
                router.push(`/people?church=${church}&list=${result.id}`);
              }
            });
          }}
          className="flex flex-col gap-4"
        >
          {failed ? <Banner tone="danger" title={t("import.failed")}>{failed}</Banner> : null}
          <Field label={t("lists.name")} required>
            <Input name="name" autoComplete="off" autoFocus />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" loading={saving}>{t("action.save")}</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("action.cancel")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; hue?: string }[];
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-label text-fg">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>{t("directory.any")}</SelectItem>
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
    </label>
  );
}

/**
 * The bar that appears when something is selected.
 *
 * It sits above the table rather than floating over it, because a floating bar
 * covers the last row, which is the row somebody is usually trying to read.
 */
function SelectionBar({
  church,
  lists,
  viewing,
  count,
  ids,
  tags,
  canArchive,
  mergeHref,
  pending,
  onClear,
  onTag,
  onStatus,
  onArchive,
}: {
  church: string;
  lists: ListOption[];
  viewing: { id: string; name: string; kind: "static" | "rule" } | null;
  count: number;
  ids: string[];
  tags: TagOption[];
  canArchive: boolean;
  mergeHref: string | null;
  pending: boolean;
  onClear: () => void;
  onTag: (tagId: string, on: boolean) => void;
  onStatus: (status: string) => void;
  onArchive: () => void;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary-soft p-3",
        pending && "opacity-60",
      )}
      aria-live="polite"
    >
      <span className="text-label text-primary">{plural("directory.selected", count)}</span>

      {tags.length > 0 ? (
        <>
          <Picker label={t("directory.bulkTag")} options={tags.map((x) => ({ value: x.id, label: x.name, hue: x.hue }))} onPick={(v) => onTag(v, true)} />
          <Picker label={t("directory.bulkUntag")} options={tags.map((x) => ({ value: x.id, label: x.name, hue: x.hue }))} onPick={(v) => onTag(v, false)} />
        </>
      ) : null}

      <Picker
        label={t("directory.bulkStatus")}
        options={LIFECYCLE_VALUES.map((v) => ({ value: v, label: lifecycleLabel(v) }))}
        onPick={onStatus}
      />

      <AddToListDialog church={church} lists={lists} count={count} ids={ids} />

      {/* R1.14. On a picked list, taking somebody off it. A list that answers
          itself has nobody to take off. */}
      {viewing?.kind === "static" ? (
        <TakeOffButton church={church} list={viewing} count={count} ids={ids} />
      ) : null}

      {mergeHref ? (
        <Button variant="ghost" asChild>
          <Link href={mergeHref}>
            <Merge /> {t("directory.merge")}
          </Link>
        </Button>
      ) : null}

      {canArchive ? (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost">
              <Archive /> {t("directory.bulkArchive")}
            </Button>
          </DialogTrigger>
          <DialogContent alert title={t("directory.bulkArchiveTitle", { count })}>
            <p className="mb-5 text-[length:var(--d-text-body)] text-fg-muted">
              {t("directory.bulkArchiveBody")}
            </p>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost" data-dismiss>{t("directory.bulkKeep")}</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button variant="danger" onClick={onArchive}>
                  <Archive /> {t("directory.bulkArchive")}
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      <Button variant="ghost" onClick={onClear} className="ml-auto">
        <X /> {t("directory.clearSelection")}
      </Button>
    </div>
  );
}

/** A select that fires on choice and then resets, so it reads as a menu. */
function Picker({
  label,
  options,
  onPick,
}: {
  label: string;
  options: { value: string; label: string; hue?: string }[];
  onPick: (value: string) => void;
}) {
  const [key, setKey] = React.useState(0);
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-label text-fg">{label}</span>
      <Select
      key={key}
      value=""
      onValueChange={(v) => {
        onPick(v);
        setKey((k) => k + 1);
      }}
    >
      <SelectTrigger aria-label={label} className="w-auto min-w-40">
        <SelectValue placeholder={label} />
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
    </div>
  );
}

/** R1.14. Putting the people on screen onto a list, new or one that exists. */
function AddToListDialog({
  church,
  lists,
  count,
  ids,
}: {
  church: string;
  lists: ListOption[];
  count: number;
  ids: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [target, setTarget] = React.useState(NEW_LIST);
  const [failed, setFailed] = React.useState<string>();
  const [saving, startTransition] = React.useTransition();

  // A list that answers itself cannot be added to, so it is not offered.
  const picked = lists.filter((list) => list.kind === "static");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost">
          <BookmarkPlus /> {t("lists.addTo")}
        </Button>
      </DialogTrigger>
      <DialogContent title={t("lists.addToTitle", { count })} closeLabel={t("common.close")}>
        <form
          noValidate
          action={(data) => {
            data.set("church", church);
            if (target !== NEW_LIST) data.set("listId", target);
            for (const id of ids) data.append("ids", id);
            startTransition(async () => {
              const result = await saveSelection(data);
              setFailed(result.error);
              if (!result.error) {
                setOpen(false);
                router.push(`/people?church=${church}&list=${result.id}`);
              }
            });
          }}
          className="flex flex-col gap-4"
        >
          {failed ? <Banner tone="danger" title={t("import.failed")}>{failed}</Banner> : null}

          {picked.length > 0 ? (
            <Field label={t("lists.which")}>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NEW_LIST}>{t("lists.newList")}</SelectItem>
                  {picked.map((list) => (
                    <SelectItem key={list.id} value={list.id}>{list.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}

          {target === NEW_LIST ? (
            <Field label={t("lists.name")} required>
              <Input name="name" autoComplete="off" autoFocus />
            </Field>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" loading={saving}>{t("action.save")}</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("action.cancel")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TakeOffButton({
  church,
  list,
  count,
  ids,
}: {
  church: string;
  list: { id: string; name: string };
  count: number;
  ids: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  return (
    <Button
      variant="ghost"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const data = new FormData();
          data.set("church", church);
          data.set("listId", list.id);
          for (const id of ids) data.append("ids", id);
          await takeOffList(data);
          router.refresh();
        })
      }
    >
      <MinusCircle /> {t("lists.remove")}
    </Button>
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
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" loading={pending}>{t("action.save")}</Button>
              <Button type="button" variant="ghost" onClick={() => setRenaming(false)}>
                {t("action.cancel")}
              </Button>
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

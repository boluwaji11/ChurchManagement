"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ArrowUp, ArrowDown, Search, X, Archive, Upload } from "lucide-react";
import {
  Avatar, Badge, Button, Card, Input, Checkbox, Banner, HueDot,
  Table, Thead, Th, Tr, Td, EmptyState,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Dialog, DialogTrigger, DialogContent, DialogClose,
  cn, type Hue,
} from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import { LIFECYCLE_VALUES, lifecycleLabel } from "@/lib/person-input";
import { bulkArchive, bulkStatus, bulkTag, type BulkResult } from "./bulk-actions";

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
  visitor: "accent",
  regular_attender: "success",
  inactive: "neutral",
};

const ANY = "__any";

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
}: {
  church: string;
  rows: Row[];
  tags: TagOption[];
  canEdit: boolean;
  canArchive: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [selected, setSelected] = React.useState<string[]>([]);
  const [result, setResult] = React.useState<BulkResult>();
  const [pending, startTransition] = React.useTransition();

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
    <div className="flex flex-col gap-4">
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
      />

      {result?.error ? <Banner tone="danger" title={t("import.failed")}>{result.error}</Banner> : null}
      {result && !result.error && result.changed !== undefined ? (
        <Banner tone="success" title={t("directory.bulkDone", { count: result.changed })} />
      ) : null}

      {selected.length > 0 && canEdit ? (
        <SelectionBar
          count={selected.length}
          tags={tags}
          canArchive={canArchive}
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
              <Th />
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
                <Td className="text-fg-muted">{p.primaryEmail ?? t("people.none")}</Td>
                <Td data-numeric className="text-fg-muted">{p.primaryPhone ?? t("people.none")}</Td>
                <Td>
                  <Link
                    href={`/people/${p.id}?church=${church}`}
                    aria-label={t("people.open", { name: p.displayName })}
                    className="inline-flex text-fg-subtle hover:text-fg"
                  >
                    <ArrowRight className="size-4" />
                  </Link>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

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
}) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-56 flex-1 flex-col gap-1.5">
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

      <div className="flex flex-wrap items-center gap-3">
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

        {canArchive ? (
          <span className="ml-auto flex flex-wrap items-center gap-3">
            <Button variant="ghost" asChild>
              <a href={exportHref} download>
                <Upload /> {filtersOn ? t("directory.exportView") : t("directory.exportAll")}
              </a>
            </Button>
          </span>
        ) : null}
      </div>
    </Card>
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
    <label className="flex min-w-40 flex-col gap-1.5">
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
  count,
  tags,
  canArchive,
  pending,
  onClear,
  onTag,
  onStatus,
  onArchive,
}: {
  count: number;
  tags: TagOption[];
  canArchive: boolean;
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

      {canArchive ? (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost">
              <Archive /> {t("directory.bulkArchive")}
            </Button>
          </DialogTrigger>
          <DialogContent
            title={t("directory.bulkArchiveTitle", { count })}
            closeLabel={t("common.close")}
          >
            <p className="mb-5 text-[length:var(--d-text-body)] text-fg-muted">
              {t("directory.bulkArchiveBody")}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <DialogClose asChild>
                <Button variant="danger" onClick={onArchive}>
                  <Archive /> {t("directory.bulkArchive")}
                </Button>
              </DialogClose>
              <DialogClose asChild>
                <Button variant="ghost">{t("action.cancel")}</Button>
              </DialogClose>
            </div>
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
    <Select
      key={key}
      value=""
      onValueChange={(v) => {
        onPick(v);
        setKey((k) => k + 1);
      }}
    >
      <SelectTrigger className="w-auto min-w-40">
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
  );
}

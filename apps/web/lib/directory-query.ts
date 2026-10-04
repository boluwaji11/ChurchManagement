import type { DirectoryQuery } from "@hearth/db";

export interface DirectoryParams {
  page?: string;
  church?: string;
  q?: string;
  status?: string;
  tag?: string;
  has?: string;
  missing?: string;
  joined?: string;
  group?: string;
  serving?: string;
  seen?: string;
  sort?: string;
  dir?: string;
  show?: string;
  archived?: string;
  welcome?: string;
  /** R1.14. A saved list, which supplies either a set of people or its filters. */
  list?: string;
  /** R2.x. An explicit selection, comma separated. Used by the export. */
  ids?: string;
}

/**
 * Turns the URL into a query.
 *
 * Shared by the directory and the export route, so a filtered export and the
 * screen it was started from run the same query. Two readings of one URL is how
 * an export quietly comes to contain something the person was not looking at.
 *
 * Unknown values are dropped rather than passed through, so a hand-edited URL
 * cannot reach a sort column or a filter that was never offered.

 *
 * The page is deliberately absent. Only the screen paginates. An export built
 * from the same URL would otherwise hand somebody page three of their directory
 * and call it the whole thing.
 */
export function queryFromParams(params: DirectoryParams): DirectoryQuery {
  const has = ["email", "phone", "noEmail", "noPhone"].includes(params.has ?? "")
    ? (params.has as DirectoryQuery["has"])
    : undefined;
  const sort = ["name", "firstName", "household", "status", "added"].includes(params.sort ?? "")
    ? (params.sort as DirectoryQuery["sort"])
    : undefined;

  const one = <T extends string>(value: string | undefined, allowed: readonly T[]) =>
    allowed.includes((value ?? "") as T) ? (value as T) : undefined;

  return {
    includeArchived: params.show === "archived",
    q: params.q,
    status: params.status,
    tagId: params.tag,
    has,
    missing: params.missing === "1",
    joined: one(params.joined, ["year", "five", "earlier"] as const),
    group: one(params.group, ["any", "none"] as const),
    serving: one(params.serving, ["any", "none"] as const),
    seen: one(params.seen, ["recent", "absent"] as const),
    sort,
    dir: params.dir === "desc" ? "desc" : "asc",
  };
}

/** The page being viewed, one-based. */
export const pageFromParams = (params: DirectoryParams): number => {
  const n = Number(params.page ?? 1);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
};

/** True when the URL narrows the directory, rather than showing all of it. */
export const isFiltered = (params: DirectoryParams): boolean =>
  Boolean(
    params.ids || params.q || params.status || params.tag || params.has ||
      params.missing || params.joined ||
      params.group || params.serving || params.seen ||
      params.show === "archived" || params.list,
  );

/**
 * R1.14. The filters a rule list holds, as URL parameters.
 *
 * A rule list is the directory's own filters, so opening one is the same as
 * having typed them. A static list arrives as a set of ids instead.
 */
export function paramsFromRule(rule: Record<string, string>): DirectoryParams {
  return {
    q: rule["q"],
    status: rule["status"],
    tag: rule["tag"],
    has: rule["has"],
    show: rule["show"],
    missing: rule["missing"],
    joined: rule["joined"],
    group: rule["group"],
    serving: rule["serving"],
    seen: rule["seen"],
  };
}

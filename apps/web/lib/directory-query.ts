import type { DirectoryQuery } from "@hearth/db";

export interface DirectoryParams {
  page?: string;
  church?: string;
  q?: string;
  status?: string;
  tag?: string;
  has?: string;
  sort?: string;
  dir?: string;
  show?: string;
  archived?: string;
  welcome?: string;
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

  return {
    includeArchived: params.show === "archived",
    q: params.q,
    status: params.status,
    tagId: params.tag,
    has,
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
  Boolean(params.q || params.status || params.tag || params.has || params.show === "archived");

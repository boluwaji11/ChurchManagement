/**
 * R2.14, R24.6. The pages a pager draws.
 *
 * Seven slots at most, whatever the list's length: the first, the last, the
 * one underfoot and one either side of it, with `null` where a run has been
 * left out. A pager that draws every page of three hundred gifts is a row of
 * thirty one numbers nobody reads, and one that draws no numbers at all leaves
 * a treasurer pressing Next eleven times to reach the end of September.
 *
 * Here rather than in either pager, because the two of them, one built from
 * links and one from presses, were drawing different rows for the same list.
 */
export function pageTokens(page: number, last: number): (number | null)[] {
  if (last <= 7) return Array.from({ length: Math.max(0, last) }, (_, at) => at + 1);

  const near = [page - 1, page, page + 1].filter((one) => one > 1 && one < last);
  const run = [1, ...near, last];

  const out: (number | null)[] = [];
  let behind = 0;
  for (const one of run) {
    if (one - behind > 1) out.push(null);
    out.push(one);
    behind = one;
  }
  return out;
}

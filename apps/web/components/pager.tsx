import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { pageTokens } from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/**
 * R24.6, R2.14. The foot of a list that is longer than the page it is on.
 *
 * Links rather than buttons, so a page of a list is an address somebody can
 * send to the treasurer, come back to, and open in a second tab. It says how
 * much of the list is on screen as well as how to move, because "Next" on
 * its own leaves somebody counting pages to work out how much is left.
 *
 * The numbers are there to be pressed. Two chevrons alone say nothing about
 * where in three hundred gifts a reader is standing, and a treasurer looking
 * for the end of September pressed Next eleven times to reach it. The first
 * page and the last are always drawn, with the current one and its neighbours,
 * so the row holds its width instead of growing with the list.
 */
export function Pager({
  page,
  size,
  total,
  href,
  anchor,
}: {
  /** One-based, as the address writes it. */
  page: number;
  size: number;
  total: number;
  /** Builds the address of a page. */
  href: (page: number) => string;
  /**
   * R24.6. The id of the block this pager belongs to.
   *
   * Turning a page is a navigation, and a navigation lands at the top of the
   * screen. Somebody reading the fourth table down then has to find their
   * way back to it every time they press Next. Naming the block puts the
   * page they asked for under their thumb instead.
   */
  anchor?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (total <= size) return null;

  const shown = Math.min(total, page * size) - (page - 1) * size;
  const to = (at: number) => `${href(at)}${anchor ? `#${anchor}` : ""}`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-2.5">
      <span data-numeric className="text-[13px] text-fg-muted">
        {t("pager.showing", { shown, total })}
      </span>

      <nav aria-label={t("pager.pages")} className="flex items-center gap-1">
        <Step href={to(page - 1)} enabled={page > 1} label={t("pager.previous")}>
          <ChevronLeft aria-hidden />
        </Step>

        {pageTokens(page, pages).map((one, at) =>
          one === null ? (
            /* A gap in the run of numbers. Spoken by nothing: the pages either
               side of it say where this is. */
            <span key={`gap-${at}`} aria-hidden className="px-1 text-fg-subtle">
              ...
            </span>
          ) : (
            <Numbered key={one} href={to(one)} page={one} here={one === page} />
          ),
        )}

        <Step href={to(page + 1)} enabled={page < pages} label={t("pager.next")}>
          <ChevronRight aria-hidden />
        </Step>
      </nav>
    </div>
  );
}

/** One page's own number, and the one underfoot. */
function Numbered({ href, page, here }: { href: string; page: number; here: boolean }) {
  const shape =
    "inline-flex min-w-9 h-9 items-center justify-center rounded-[var(--d-radius-control)] "
    + "border px-2 text-[13px] font-medium";

  if (here) {
    return (
      <span
        data-numeric
        aria-current="page"
        className={`${shape} border-line-strong bg-surface text-fg shadow-sm`}
      >
        {page}
      </span>
    );
  }

  return (
    <Link
      href={href}
      data-numeric
      aria-label={t("pager.page", { page })}
      className={`${shape} border-line text-fg-muted hover:bg-sunken hover:text-fg`}
    >
      {page}
    </Link>
  );
}

/**
 * One end of the pager.
 *
 * At the end of the list it is drawn and inert rather than taken away, so the
 * pair keeps its shape and the other one does not move under the pointer.
 */
export function Step({
  href,
  enabled,
  label,
  children,
}: {
  href: string;
  enabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const shape =
    "inline-flex size-9 items-center justify-center rounded-[var(--d-radius-control)] "
    + "border border-line [&_svg]:size-4";

  if (!enabled) {
    return (
      <span aria-hidden className={`${shape} text-fg-subtle opacity-40`}>{children}</span>
    );
  }

  return (
    <Link href={href} aria-label={label} className={`${shape} text-fg-muted hover:bg-sunken hover:text-fg`}>
      {children}
    </Link>
  );
}

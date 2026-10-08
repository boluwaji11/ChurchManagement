import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { t } from "@connectapp/i18n";

/**
 * R24.6. The foot of a list that is longer than the page it is on.
 *
 * Links rather than buttons, so a page of a list is an address somebody can
 * send to the treasurer, come back to, and open in a second tab. It says how
 * much of the list is on screen as well as how to move, because "Next" on
 * its own leaves somebody counting pages to work out how much is left.
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

      <span className="flex items-center gap-1">
        <Step href={to(page - 1)} enabled={page > 1} label={t("pager.previous")}>
          <ChevronLeft aria-hidden />
        </Step>
        <Step href={to(page + 1)} enabled={page < pages} label={t("pager.next")}>
          <ChevronRight aria-hidden />
        </Step>
      </span>
    </div>
  );
}

/**
 * One end of the pager.
 *
 * At the end of the list it is drawn and inert rather than taken away, so the
 * pair keeps its shape and the other one does not move under the pointer.
 */
function Step({
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

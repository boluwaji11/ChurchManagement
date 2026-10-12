import * as React from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "../lib/cn";

/** Rows sized by density. Tabular figures so numbers line up and compare. */
export const Table = ({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) => (
  <div className="w-full overflow-x-auto rounded-lg border border-line bg-surface">
    <table className={cn("w-full text-[length:var(--d-text-body)]", className)} {...props} />
  </div>
);

export const Thead = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={cn("bg-sunken", className)} {...props} />
);

export const Th = ({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    /* The heading stays on one line. The table scrolls sideways on a phone
       anyway, and "Last attended" stacked two words deep in an 80px column
       makes the heading row twice the height of the rows under it. */
    className={cn(
      "px-3 text-left text-label font-semibold text-fg h-[var(--d-row-h)] whitespace-nowrap",
      className,
    )}
    {...props}
  />
);

export const Tr = ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr
    className={cn("border-t border-line transition-colors duration-instant hover:bg-sunken/60", className)}
    {...props}
  />
);

export const Td = ({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn("px-3 h-[var(--d-row-h)] align-middle", className)} {...props} />
);

/** Which way a column is sorted, or null for a column that is sortable and is not. */
export type SortWay = "asc" | "desc" | null;

/**
 * R2.14, R24.6. A heading that sorts, and says which way.
 *
 * No screen in the product could sort a column before this: there was not one
 * `aria-sort` anywhere, so sixteen tables of a church's own records could only
 * be read in the order the query happened to return.
 *
 * `href` rather than a press, where the caller can give one. A sort belongs in
 * the address so the sorted view can be sent to somebody or kept in a tab, and
 * a sort held in component state is lost on the next navigation. `onSort` is
 * there for a table whose rows never leave the browser.
 *
 * The mark is always drawn, greyed until the column is the sorted one. A
 * chevron that appears on hover is a control that does not exist for anybody
 * reading with a keyboard or a finger.
 */
export function SortTh({
  way,
  href,
  onSort,
  linkAs,
  children,
  className,
  ...props
}: Omit<React.ThHTMLAttributes<HTMLTableCellElement>, "onClick"> & {
  /** "asc", "desc", or null when this column is sortable and not sorted. */
  way: SortWay;
  /** Where pressing it goes. The sort lives in the address. */
  href?: string;
  /** For a table that sorts in the browser and has no address to carry it. */
  onSort?: () => void;
  linkAs?: React.ElementType;
}) {
  const Link = linkAs ?? "a";
  const Mark = way === "asc" ? ArrowUp : way === "desc" ? ArrowDown : ChevronsUpDown;

  const inside = (
    <>
      <span className="truncate">{children}</span>
      <Mark
        aria-hidden
        className={cn("size-3.5 shrink-0", way ? "text-primary" : "text-fg-subtle")}
      />
    </>
  );

  const shape = cn(
    "-mx-1 flex max-w-full items-center gap-1.5 rounded-md px-1 py-0.5",
    "font-semibold text-fg no-underline",
    "transition-colors duration-instant hover:text-primary",
  );

  return (
    <Th
      /* What a screen reader reads out, and what a test can assert on. */
      aria-sort={way === "asc" ? "ascending" : way === "desc" ? "descending" : "none"}
      className={className}
      {...props}
    >
      {href ? (
        <Link href={href} className={shape}>{inside}</Link>
      ) : (
        <button type="button" onClick={onSort} className={cn(shape, "cursor-pointer")}>
          {inside}
        </button>
      )}
    </Th>
  );
}

/**
 * R24.17. Nothing matched, said inside the table.
 *
 * Inside, because a filter that empties a list should leave the headings and
 * the filters standing: replacing the whole screen takes away the controls
 * that caused it and the reader cannot see what to undo.
 */
export function TableEmpty({
  colSpan,
  children,
  className,
}: {
  /** Every column, so the row spans the table rather than sitting in the first. */
  colSpan: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <tr className="border-t border-line">
      <td
        colSpan={colSpan}
        className={cn("px-3 py-10 text-center text-fg-muted", className)}
      >
        {children}
      </td>
    </tr>
  );
}

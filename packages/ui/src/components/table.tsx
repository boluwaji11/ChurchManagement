import * as React from "react";
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

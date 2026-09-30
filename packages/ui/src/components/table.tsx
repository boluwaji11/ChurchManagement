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
    className={cn("px-3 text-left text-label font-medium text-fg-muted h-[var(--d-row-h)]", className)}
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

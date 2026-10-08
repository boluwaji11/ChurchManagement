import * as React from "react";
import { cn } from "../lib/cn";

/** A hairline does the work, the shadow hints. No backdrop blur, ever. */
export const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("bg-surface border border-line rounded-lg shadow-sm p-[var(--d-pad-card)]", className)}
    {...props}
  />
);

export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-start justify-between gap-4 mb-3", className)} {...props} />
);

export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("min-w-0 text-title text-fg", className)} {...props} />
);

export const CardDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("min-w-0 text-caption text-fg-muted", className)} {...props} />
);

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Info, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "../lib/cn";

const banner = cva("flex items-start gap-3 rounded-lg border p-3 text-[length:var(--d-text-body)]", {
  variants: {
    tone: {
      info: "bg-info-soft border-info/25 text-info-text",
      success: "bg-success-soft border-success/25 text-success-text",
      warning: "bg-warning-soft border-warning/30 text-warning-text",
      danger: "bg-danger-soft border-danger/30 text-danger-text",
    },
  },
  defaultVariants: { tone: "info" },
});

const icons = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: XCircle };

export interface BannerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof banner> {
  title?: string;
}

/**
 * Errors persist near their cause. A toast that vanishes is not error reporting.
 * Colour is never the only signal, so every tone carries its own icon. (R24.9)
 */
export function Banner({ className, tone = "info", title, children, ...props }: BannerProps) {
  const Icon = icons[tone ?? "info"];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn(banner({ tone }), className)} {...props}>
      <Icon className="size-5 shrink-0 mt-px" aria-hidden />
      <div className="flex flex-col gap-0.5 min-w-0">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className="text-fg-muted">{children}</div> : null}
      </div>
    </div>
  );
}

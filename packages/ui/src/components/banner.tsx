"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Info, CheckCircle2, AlertTriangle, XCircle, X } from "lucide-react";
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
  /** Given where the screen wants to know. Left out, the banner closes itself. */
  onClose?: () => void;
  closeLabel?: string;
  /** False on a banner that has to stay, such as a field's own error. */
  closable?: boolean;
}

/**
 * Errors persist near their cause. A toast that vanishes is not error reporting.
 * Colour is never the only signal, so every tone carries its own icon. (R24.9)
 */
export function Banner({
  className,
  tone = "info",
  title,
  onClose,
  closeLabel,
  closable = true,
  children,
  ...props
}: BannerProps) {
  const Icon = icons[tone ?? "info"];

  /*
   * R24.9. Anything said on screen can be put away.
   *
   * A screen holding the state passes `onClose` and decides what happens. A
   * screen that is not gets the cross anyway, and the banner remembers for
   * itself that it has been dismissed, so nobody is left reading a message
   * they have finished with.
   */
  const [gone, setGone] = React.useState(false);
  if (gone) return null;

  const close = onClose ?? (() => setGone(true));

  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn(banner({ tone }), className)} {...props}>
      <Icon className="size-5 shrink-0 mt-px" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className="text-fg-muted">{children}</div> : null}
      </div>
      {closable ? (
        <button
          type="button"
          onClick={close}
          aria-label={closeLabel ?? "Close"}
          className="-m-1 shrink-0 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

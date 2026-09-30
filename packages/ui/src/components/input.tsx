"use client";

import * as React from "react";
import { cn } from "../lib/cn";

const base = [
  "w-full bg-surface text-fg placeholder:text-fg-subtle",
  "min-h-[var(--d-tap)] px-[var(--d-pad-control-x)] rounded-[var(--d-radius-control)]",
  "text-[length:var(--d-text-body)]",
  "border border-line-strong shadow-sm",
  "transition-[border-color,box-shadow] duration-instant ease-out",
  "hover:border-fg-subtle",
  "disabled:opacity-45 disabled:pointer-events-none",
  "aria-[invalid=true]:border-danger aria-[invalid=true]:bg-danger-soft",
].join(" ");

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(base, className)} {...props} />,
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, rows = 4, ...props }, ref) => (
  <textarea ref={ref} rows={rows} className={cn(base, "py-2 resize-y", className)} {...props} />
));
Textarea.displayName = "Textarea";

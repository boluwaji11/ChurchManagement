"use client";

/**
 * HRT-378, R22.2. The bar across the top of the editor.
 *
 * Quiet, so the website underneath it is what the eye goes to, with one clear
 * action on the right. What a church is doing, which page it is on and whether
 * its work is saved all read from left to right in the order somebody asks the
 * questions.
 */

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft, Check, CloudAlert, ExternalLink, Loader2, Monitor,
  Redo2, Smartphone, Tablet, Undo2,
} from "lucide-react";
import { t } from "@connectapp/i18n";
import {
  Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Tooltip,
} from "@connectapp/ui";
import type { SiteDoc } from "@connectapp/db/rules";
import type { Device, SaveState } from "./store";

const BAR_BUTTON =
  "inline-flex size-9 items-center justify-center rounded-md border border-transparent"
  + " text-fg-muted transition-colors hover:bg-raised hover:text-fg"
  + " focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
  + " focus-visible:outline-primary disabled:opacity-35 disabled:hover:bg-transparent";

function Bare({
  label,
  onPress,
  disabled,
  children,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip content={label}>
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        onClick={onPress}
        className={BAR_BUTTON}
      >
        {children}
      </button>
    </Tooltip>
  );
}

const DEVICES: { key: Device; icon: typeof Monitor; label: string }[] = [
  { key: "desk", icon: Monitor, label: "website.device.desk" },
  { key: "tablet", icon: Tablet, label: "website.device.tablet" },
  { key: "phone", icon: Smartphone, label: "website.device.phone" },
];

/** Saving, saved, or something a church has to know about. */
function Saved({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  const look = "flex items-center gap-1.5 text-xs font-medium";
  switch (state) {
    case "saving":
      return (
        <span className={`${look} text-fg-muted`}>
          <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
          {t("website.savingNow")}
        </span>
      );
    case "saved":
    case "clean":
      return (
        <span className={`${look} text-fg-muted`}>
          <Check className="size-3.5" aria-hidden />
          {t("website.savedNow")}
        </span>
      );
    case "dirty":
      return <span className={`${look} text-fg-muted`}>{t("website.notSaved")}</span>;
    case "failed":
    case "conflict":
      return (
        <span className={`${look} text-danger`}>
          <CloudAlert className="size-3.5" aria-hidden />
          {t("website.saveFailed")}
          <button
            type="button"
            onClick={onRetry}
            className="underline underline-offset-2 hover:no-underline"
          >
            {t("website.retrySave")}
          </button>
        </span>
      );
  }
}

export function Toolbar({
  doc,
  pageId,
  device,
  save,
  canUndo,
  canRedo,
  changed,
  published,
  canPublish,
  publishing,
  onPage,
  onDevice,
  onUndo,
  onRedo,
  onRetry,
  onPublish,
  previewHref,
  onPreview,
}: {
  doc: SiteDoc;
  pageId: string;
  device: Device;
  save: SaveState;
  canUndo: boolean;
  canRedo: boolean;
  changed: boolean;
  published: boolean;
  canPublish: boolean;
  publishing: boolean;
  onPage: (id: string) => void;
  onDevice: (device: Device) => void;
  onUndo: () => void;
  onRedo: () => void;
  onRetry: () => void;
  onPublish: () => void;
  previewHref: string;
  /** Saves whatever is in hand, then opens the preview in its own tab. */
  onPreview: () => void;
}) {
  return (
    <div className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-3">
      <Tooltip content={t("website.back")}>
        <Link href="/dashboard" aria-label={t("website.back")} className={BAR_BUTTON}>
          <ArrowLeft className="size-4" aria-hidden />
        </Link>
      </Tooltip>

      <span className="hidden min-w-0 items-center gap-2 sm:flex">
        <span className="truncate text-sm font-semibold text-fg">
          {t("website.yourWebsite")}
        </span>
      </span>

      <div className="min-w-0 max-w-56">
        <Select value={pageId} onValueChange={onPage}>
          <SelectTrigger aria-label={t("website.panel.pages")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {doc.pages.map((page) => (
              <SelectItem key={page.id} value={page.id}>{page.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Saved state={save} onRetry={onRetry} />

      <div className="mx-auto flex items-center gap-1 rounded-lg border border-line p-0.5">
        {DEVICES.map((one) => {
          const Icon = one.icon;
          const now = device === one.key;
          return (
            <Tooltip key={one.key} content={t(one.label as "website.device.desk")}>
              <button
                type="button"
                aria-label={t(one.label as "website.device.desk")}
                aria-pressed={now}
                onClick={() => onDevice(one.key)}
                className={
                  "inline-flex size-8 items-center justify-center rounded-md transition-colors"
                  + " focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  + " focus-visible:outline-primary "
                  + (now ? "bg-primary text-primary-fg" : "text-fg-muted hover:bg-raised hover:text-fg")
                }
              >
                <Icon className="size-4" aria-hidden />
              </button>
            </Tooltip>
          );
        })}
      </div>

      <div className="flex items-center gap-1">
        <Bare label={t("website.undo")} onPress={onUndo} disabled={!canUndo}>
          <Undo2 className="size-4" aria-hidden />
        </Bare>
        <Bare label={t("website.redo")} onPress={onRedo} disabled={!canRedo}>
          <Redo2 className="size-4" aria-hidden />
        </Bare>
        <Tooltip content={t("website.openPreview")}>
          {/*
            * A link, so it can be opened in a tab of its own the usual way,
            * with the press intercepted: the preview reads the saved draft,
            * and a page added a second ago is not in it yet.
            */}
          <a
            href={previewHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("website.openPreview")}
            data-guide="website-preview"
            className={BAR_BUTTON}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
              event.preventDefault();
              onPreview();
            }}
          >
            <ExternalLink className="size-4" aria-hidden />
          </a>
        </Tooltip>
        <Button
          type="button"
          data-guide="publish-website"
          onClick={onPublish}
          disabled={!canPublish || publishing || (published && !changed)}
          aria-busy={publishing}
        >
          {publishing ? (
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
          ) : null}
          {published ? t("website.publishChanges") : t("website.publishNow")}
        </Button>
      </div>
    </div>
  );
}

"use client";

/**
 * HRT-378, R22.2. The website builder: one screen, four regions.
 *
 * This holds the document, the history and the saving, and hands everything
 * else down. Every change in the editor arrives here as the next document, so
 * there is one place that decides what an undo step is and one place that
 * writes to the server.
 *
 * The three regions around the canvas are panels rather than forms: the left
 * rail is what the website is made of, the right column is whatever is selected
 * at the moment, and the bar across the top is the state of the work.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Images, LayoutGrid, Palette, PanelRight, PanelRightClose, Plus, Settings2,
} from "lucide-react";
import { t } from "@connectapp/i18n";
import {
  Banner, Button, Dialog, DialogContent, DialogFooter, Field, Input, Sheet,
  SheetContent, Tooltip, Working,
} from "@connectapp/ui";
import type { SiteDoc, SiteImage, SitePage } from "@connectapp/db/rules";
import type { SiteCtx } from "@/components/church-site/kit";
import {
  docFromTemplate, newPage as buildPage, newSection as buildSection,
  type PageStarter, type TemplateKey,
} from "@/components/church-site/starter";
import { Canvas } from "./canvas";
import { Inspector } from "./inspector";
import {
  DesignPanel, MediaPanel, PagesPanel, PanelFrame, SettingsPanel,
} from "./panels";
import { Library, LayoutChooser } from "./library";
import { Gallery } from "./gallery";
import { Toolbar } from "./toolbar";
import type { BuilderApi, BuilderChurch, FormChoice, GroupTypeChoice, MediaItem } from "./api";
import {
  canRedo, canUndo, duplicateSection, moveSection, pageOf, reduce,
  removeSection, setField, toggleHidden, type Panel, type State,
} from "./store";
import {
  listRevisions, publish, restoreRevision, saveDraft, startFromTemplate, takeDown,
  type RevisionRow,
} from "../actions";

/*
 * The rail, with its words.
 *
 * Five marks and nothing else was five guesses: a volunteer looking for the
 * designs had no way of knowing a palette meant Design, and a tooltip only
 * answers somebody who already suspects the answer.
 */
const RAIL: { key: Panel; icon: typeof LayoutGrid; label: string }[] = [
  { key: "pages", icon: LayoutGrid, label: "website.panel.pages" },
  { key: "add", icon: Plus, label: "website.panel.add" },
  { key: "design", icon: Palette, label: "website.panel.design" },
  { key: "media", icon: Images, label: "website.panel.mediaShort" },
  { key: "settings", icon: Settings2, label: "website.panel.settings" },
];

const TIP_SEEN = "connectapp-website-tip";
const PANE_SHUT = "connectapp-website-pane-shut";

let ids = 0;
const newId = (stem: string): string => {
  ids += 1;
  return `${stem}-${Date.now().toString(36)}${ids.toString(36)}`;
};

export function Workspace({
  doc,
  version,
  publishedAt,
  changed,
  site,
  church,
  forms,
  groupTypes,
  media,
}: {
  doc: SiteDoc | null;
  version: number;
  publishedAt: string | null;
  changed: boolean;
  site: SiteCtx | null;
  church: BuilderChurch;
  forms: FormChoice[];
  groupTypes: GroupTypeChoice[];
  media: MediaItem[];
}) {
  const router = useRouter();

  /* A church with no website at all meets the gallery and nothing else. */
  if (!doc || !site) {
    return (
      <FirstRun church={church} onStarted={() => router.refresh()} />
    );
  }

  return (
    <Builder
      doc={doc}
      version={version}
      publishedAt={publishedAt}
      changed={changed}
      site={site}
      church={church}
      forms={forms}
      groupTypes={groupTypes}
      media={media}
    />
  );
}

/** The gallery, for a church that has never had a website. */
function FirstRun({
  church,
  onStarted,
}: {
  church: BuilderChurch;
  onStarted: () => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const choose = (key: string) => {
    setBusy(true);
    setError(null);
    void (async () => {
      const doc = docFromTemplate(key as TemplateKey, { name: church.name });
      const result = await startFromTemplate(doc);
      if (result.error) {
        setError(result.error);
        setBusy(false);
        return;
      }
      onStarted();
    })();
  };

  return (
    <div className="flex min-h-[calc(100dvh-180px)] flex-col gap-6">
      {error ? <Banner tone="danger">{error}</Banner> : null}
      <Working open={busy} label={t("website.savingNow")} />
      <Gallery church={{ name: church.name, slug: church.slug }} onChoose={choose} />
    </div>
  );
}

function Builder({
  doc,
  version,
  publishedAt,
  changed,
  site,
  church,
  forms,
  groupTypes,
  media,
}: {
  doc: SiteDoc;
  version: number;
  publishedAt: string | null;
  changed: boolean;
  site: SiteCtx;
  church: BuilderChurch;
  forms: FormChoice[];
  groupTypes: GroupTypeChoice[];
  media: MediaItem[];
}) {
  const router = useRouter();
  const [state, send] = React.useReducer(reduce, {
    doc,
    version,
    pageId: doc.homeId,
    selected: null,
    device: "desk",
    panel: null,
    save: "clean",
    error: null,
    past: [],
    future: [],
    typing: null,
    publishedAt,
    changed,
  } satisfies State);

  const [library, setLibrary] = React.useState<number | null>(null);
  const [layoutFor, setLayoutFor] = React.useState<string | null>(null);
  const [gallery, setGallery] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const [publishAsk, setPublishAsk] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [tip, setTip] = React.useState(false);
  const [uploads, setUploads] = React.useState(0);
  const [held, setHeld] = React.useState<MediaItem[]>(media);
  const [revisions, setRevisions] = React.useState<RevisionRow[]>([]);
  const [linkAt, setLinkAt] = React.useState<{ sectionId: string; path: string } | null>(null);
  const [mediaFor, setMediaFor] = React.useState<{ sectionId: string; path: string } | null>(null);
  /*
   * The editing panel, which a church can put away.
   *
   * The canvas is the point of this screen, and the room it gets depends on
   * what else is open: the setup guide's rail takes 440px while a church is
   * still being set up. So the panel closes itself when there is no room for
   * all three, and stays however the church last left it.
   */
  const [pane, setPane] = React.useState(true);
  const [paneByHand, setPaneByHand] = React.useState(false);
  const body = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    try {
      if (!window.localStorage.getItem(TIP_SEEN)) setTip(true);
      if (window.localStorage.getItem(PANE_SHUT) === "yes") {
        setPane(false);
        setPaneByHand(true);
      }
    } catch {
      /* A private window, where there is nothing to remember. */
    }
  }, []);

  /* Until the church says otherwise, the panel follows the room there is. */
  React.useEffect(() => {
    const held = body.current;
    if (!held || paneByHand) return undefined;
    const watch = new ResizeObserver(([entry]) => {
      const wide = (entry?.contentRect.width ?? 0) >= 1180;
      setPane((now) => (now === wide ? now : wide));
    });
    watch.observe(held);
    return () => watch.disconnect();
  }, [paneByHand]);

  const showPane = (open: boolean) => {
    setPane(open);
    setPaneByHand(true);
    try {
      window.localStorage.setItem(PANE_SHUT, open ? "no" : "yes");
    } catch {
      /* Nothing to remember in a private window. */
    }
  };

  const page: SitePage = pageOf(state.doc, state.pageId);

  /* ---------------------------------------------------------------- saving --- */

  const latest = React.useRef(state);
  latest.current = state;

  /* The save that is in flight, so anything that needs the server to be up to
     date can wait for it rather than racing it. */
  const inFlight = React.useRef<Promise<void> | null>(null);

  const write = React.useCallback(async () => {
    const now = latest.current;
    if (now.save !== "dirty") return;
    send({ kind: "saving" });
    const result = await saveDraft(now.doc, now.version);
    if (result.conflict) {
      send({ kind: "conflict", error: result.error ?? t("website.error.conflict") });
      return;
    }
    if (result.error || result.version === undefined) {
      send({ kind: "failed", error: result.error ?? t("website.saveFailed") });
      return;
    }
    send({ kind: "saved", version: result.version });
  }, []);

  /** Writes, and holds the promise so a press can wait for it. */
  const writeNow = React.useCallback(() => {
    const run = write().finally(() => { inFlight.current = null; });
    inFlight.current = run;
    return run;
  }, [write]);

  /* Settles after a change rather than on every keystroke, so a church typing
     a paragraph sends one save instead of forty. */
  React.useEffect(() => {
    if (state.save !== "dirty") return undefined;
    const timer = window.setTimeout(() => { void writeNow(); }, 1200);
    return () => window.clearTimeout(timer);
  }, [state.save, state.doc, writeNow]);

  /* Leaving the tab with work in hand saves it rather than asking. */
  React.useEffect(() => {
    const onHide = () => {
      if (latest.current.save === "dirty") void write();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [write]);

  /* ------------------------------------------------------------- the keys --- */

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = (event.target as HTMLElement | null)?.closest?.(
        "input, textarea, [contenteditable='true']",
      );
      const command = event.metaKey || event.ctrlKey;
      if (!command) return;
      const key = event.key.toLowerCase();
      if (key === "s") {
        event.preventDefault();
        void write();
        return;
      }
      if (typing) return;
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        send({ kind: "undo" });
        return;
      }
      if ((key === "z" && event.shiftKey) || key === "y") {
        event.preventDefault();
        send({ kind: "redo" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [write]);

  /* ---------------------------------------------------------------- the api --- */

  const change = React.useCallback((next: SiteDoc, merge?: string) => {
    send({ kind: "doc", doc: next, ...(merge ? { merge } : {}) });
  }, []);

  const uploadMedia = React.useCallback(async (file: File): Promise<SiteImage | null> => {
    setUploads((n) => n + 1);
    try {
      const body = new FormData();
      body.set("purpose", "website_media");
      body.set("file", file);
      const answer = await fetch("/api/upload", { method: "POST", body });
      const result = await answer.json() as { key?: string; error?: string };
      if (!answer.ok || !result.key) {
        send({ kind: "failed", error: result.error ?? t("website.mediaUploadFailed") });
        return null;
      }
      const image: SiteImage = {
        key: result.key,
        url: null,
        alt: "",
        focus: { x: 0.5, y: 0.5 },
        fit: "cover",
      };
      setHeld((all) => [
        { key: result.key!, bytes: file.size, uploadedAt: new Date().toISOString(), inUse: false },
        ...all,
      ]);
      return image;
    } catch {
      send({ kind: "failed", error: t("website.mediaUploadFailed") });
      return null;
    } finally {
      setUploads((n) => n - 1);
    }
  }, []);

  const removeMedia = React.useCallback(async (key: string) => {
    /* The picture comes off every page that shows it, and the sweep that runs
       after the next save takes it out of storage. */
    setHeld((all) => all.filter((one) => one.key !== key));
  }, []);

  const api: BuilderApi = {
    doc: state.doc,
    pageId: state.pageId,
    page,
    selected: state.selected,
    site: { ...site, doc: state.doc, editing: true },
    church,
    forms,
    groupTypes,
    media: held,
    publishedAt: state.publishedAt,
    changed: state.changed,
    change,
    /*
     * Pressing something on the page is asking to change it, so the panel
     * comes back whether it was put away by hand or stepped aside on its own.
     * Clearing the selection leaves the panel where the church left it.
     */
    select: (selection) => {
      if (selection) setPane(true);
      send({ kind: "select", selection });
    },
    setPanel: (panel) => send({ kind: "panel", panel }),
    setPage: (pageId) => send({ kind: "page", pageId }),
    openLibrary: (at) => setLibrary(at),
    openLayout: (sectionId) => setLayoutFor(sectionId),
    openGallery: () => setGallery(true),
    openMedia: (target) => {
      setMediaFor(target);
      send({ kind: "panel", panel: "media" });
    },
    mediaFor,
    uploadMedia,
    removeMedia,
    newSection: (type, variant) => buildSection(type, variant, { name: church.name }),
    newPage: (starter) => buildPage(starter as PageStarter, { name: church.name }),
    newId,
  };

  /* ------------------------------------------------------------ publishing --- */

  /**
   * The preview, showing what is on screen rather than what was last settled.
   *
   * It is a route that reads the saved draft, so a page added a moment ago is
   * not in it yet and the address 404s. The tab is opened on the press, because
   * a browser blocks one opened after an await, and sent to the preview once
   * the save has landed.
   */
  const openPreview = () => {
    const tab = window.open("", "connectapp-website-preview");
    void (async () => {
      /* A save started a moment ago has to land first, and a change made since
         it started has to go up after it. */
      await inFlight.current;
      if (latest.current.save === "dirty") await writeNow();
      const now = pageOf(latest.current.doc, latest.current.pageId);
      const where = now.slug ? `/website/preview/${now.slug}` : "/website/preview";
      if (tab) tab.location.href = where;
      else window.location.href = where;
    })();
  };

  const doPublish = () => {
    setPublishing(true);
    void (async () => {
      /* Anything in hand goes up first, so what is published is what is on
         screen rather than what was last settled. */
      await inFlight.current;
      if (latest.current.save === "dirty") await writeNow();
      const result = await publish(note.trim() || undefined);
      setPublishing(false);
      setPublishAsk(false);
      setNote("");
      if (result.error) {
        send({ kind: "failed", error: result.error });
        return;
      }
      send({ kind: "published", at: result.publishedAt ?? null });
    })();
  };

  const onTakeDown = () => {
    void (async () => {
      const result = await takeDown();
      if (result.error) {
        send({ kind: "failed", error: result.error });
        return;
      }
      send({ kind: "published", at: null });
      router.refresh();
    })();
  };

  const loadRevisions = React.useCallback(() => {
    void (async () => {
      setRevisions(await listRevisions());
    })();
  }, []);

  const onRestore = (id: string) => {
    void (async () => {
      const result = await restoreRevision(id);
      if (result.error || !result.doc || result.version === undefined) {
        send({ kind: "failed", error: result.error ?? t("website.saveFailed") });
        return;
      }
      send({ kind: "replace", doc: result.doc, version: result.version });
      send({ kind: "published", at: new Date().toISOString() });
    })();
  };

  /* ------------------------------------------------------------- the panel --- */

  const panel = (() => {
    switch (state.panel) {
      case "pages": return <PagesPanel api={api} />;
      case "design":
        return <DesignPanel api={api} onChangeDesign={() => setGallery(true)} />;
      case "media":
        return <MediaPanel api={api} onUsed={() => setMediaFor(null)} />;
      case "settings":
        return (
          <SettingsPanel
            api={api}
            revisions={revisions}
            onLoadRevisions={loadRevisions}
            onRestore={onRestore}
            onTakeDown={onTakeDown}
            onChangeDesign={() => setGallery(true)}
          />
        );
      default: return null;
    }
  })();

  const panelTitle = state.panel
    ? t(`website.panel.${state.panel}` as "website.panel.pages")
    : "";

  /* ------------------------------------------------------------- the canvas --- */

  const width = state.device === "phone" ? 390 : state.device === "tablet" ? 834 : 0;
  const previewHref = page.slug
    ? `/website/preview/${page.slug}`
    : "/website/preview";

  return (
    <div className="-mx-4 -my-3 flex h-[calc(100dvh-56px)] flex-col overflow-hidden sm:-mx-6">
      <Toolbar
        doc={state.doc}
        pageId={state.pageId}
        device={state.device}
        save={state.save}
        canUndo={canUndo(state)}
        canRedo={canRedo(state)}
        changed={state.changed}
        published={Boolean(state.publishedAt)}
        canPublish={church.canPublish}
        publishing={publishing}
        onPage={(id) => send({ kind: "page", pageId: id })}
        onDevice={(device) => send({ kind: "device", device })}
        onUndo={() => send({ kind: "undo" })}
        onRedo={() => send({ kind: "redo" })}
        onRetry={() => { void write(); }}
        onPublish={() => setPublishAsk(true)}
        previewHref={previewHref}
        onPreview={openPreview}
      />

      {state.error ? (
        <div className="shrink-0 px-3 pt-3">
          <Banner tone="danger">{state.error}</Banner>
        </div>
      ) : null}
      {!church.canPublish ? (
        <div className="shrink-0 px-3 pt-3">
          <Banner tone="warning">{t("website.needsApproval")}</Banner>
        </div>
      ) : null}

      {gallery ? (
        <div className="min-h-0 flex-1 overflow-y-auto bg-canvas px-6 py-8">
          <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="m-0 font-display text-2xl font-normal text-fg">
                {t("website.gallery.title")}
              </h2>
              <Button variant="secondary" onClick={() => setGallery(false)}>
                {t("website.gallery.closePreview")}
              </Button>
            </div>
            <Gallery
              church={{ name: church.name, slug: church.slug }}
              current={state.doc.template}
              onChoose={(key: string) => {
                change(docFromTemplate(key as TemplateKey, { name: church.name }));
                setGallery(false);
              }}
              onClose={() => setGallery(false)}
            />
          </div>
        </div>
      ) : (
      <div ref={body} className="@container/editor flex min-h-0 flex-1">
        {/* The rail: what the website is made of. */}
        <nav
          aria-label={t("website.yourWebsite")}
          className="flex w-[72px] shrink-0 flex-col items-center gap-1 border-r border-line bg-surface py-3"
        >
          {RAIL.map((one) => {
            const Icon = one.icon;
            const open = state.panel === one.key;
            const words = t(one.label as "website.panel.pages");
            return (
              <button
                key={one.key}
                type="button"
                aria-pressed={open}
                onClick={() => {
                  if (one.key === "add") {
                    setLibrary(page.sections.length);
                    return;
                  }
                  send({ kind: "panel", panel: open ? null : one.key });
                }}
                className={
                  "flex w-16 flex-col items-center gap-1 rounded-lg px-1 py-2 text-center"
                  + " transition-colors focus-visible:outline focus-visible:outline-2"
                  + " focus-visible:outline-offset-2 focus-visible:outline-primary "
                  + (open
                    ? "bg-primary text-primary-fg"
                    : "text-fg-muted hover:bg-raised hover:text-fg")
                }
              >
                <Icon className="size-5" aria-hidden />
                <span className="text-[11px] font-medium leading-tight">{words}</span>
              </button>
            );
          })}
        </nav>

        {panel ? (
          <aside className="w-80 shrink-0 overflow-y-auto border-r border-line bg-surface">
            <PanelFrame
              title={panelTitle}
              onClose={() => send({ kind: "panel", panel: null })}
            >
              {panel}
            </PanelFrame>
          </aside>
        ) : null}

        {/* The website. */}
        <div className="min-w-[380px] flex-1 overflow-y-auto bg-sunken">
          {state.device === "desk" ? (
            <div className="min-h-full">
              <Canvas
                doc={state.doc}
                page={page}
                site={api.site}
                selected={state.selected}
                handlers={{
                  onSelect: (selection) => {
                    if (selection) setPane(true);
                    send({ kind: "select", selection });
                  },
                  onField: (sectionId, path, value) =>
                    change(
                      setField(state.doc, state.pageId, sectionId, path, value),
                      `field:${sectionId}:${path}`,
                    ),
                  onMove: (from, to) =>
                    change(moveSection(state.doc, state.pageId, from, to)),
                  onDuplicate: (sectionId) =>
                    change(duplicateSection(state.doc, state.pageId, sectionId, newId("s"))),
                  onRemove: (sectionId) =>
                    change(removeSection(state.doc, state.pageId, sectionId)),
                  onHide: (sectionId) =>
                    change(toggleHidden(state.doc, state.pageId, sectionId)),
                  onAddAt: (at) => setLibrary(at),
                  onLayout: (sectionId) => setLayoutFor(sectionId),
                }}
                onLink={setLinkAt}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 p-6">
              <p className="m-0 text-sm text-fg-muted">
                {t("website.previewOnly", {
                  device: t(`website.device.${state.device}` as "website.device.phone"),
                })}
              </p>
              <div
                className="overflow-hidden rounded-[28px] border border-line bg-surface shadow-lg"
                style={{ width, height: "min(1000px, calc(100dvh - 190px))" }}
              >
                <iframe
                  title={t("website.openPreview")}
                  src={previewHref}
                  className="size-full border-0"
                />
              </div>
            </div>
          )}
        </div>

        {/* Whatever is selected. */}
        {pane ? (
          <aside className="flex w-[332px] shrink-0 flex-col border-l border-line bg-surface">
            {/* The way to put it away sits on the panel it puts away. */}
            <div className="flex shrink-0 justify-end border-b border-line px-2 py-1.5">
              <Tooltip content={t("website.pane.close")}>
                <button
                  type="button"
                  aria-label={t("website.pane.close")}
                  aria-expanded
                  onClick={() => showPane(false)}
                  className={
                    "inline-flex size-8 items-center justify-center rounded-md text-fg-muted"
                    + " transition-colors hover:bg-raised hover:text-fg focus-visible:outline"
                    + " focus-visible:outline-2 focus-visible:outline-offset-2"
                    + " focus-visible:outline-primary"
                  }
                >
                  <PanelRightClose className="size-4" aria-hidden />
                </button>
              </Tooltip>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <Inspector api={api} />
            </div>
          </aside>
        ) : (
          /* A slim tab on the edge, which is the only thing left of the panel
             once it is away. */
          <div className="shrink-0 border-l border-line bg-surface">
            <Tooltip content={t("website.pane.open")} side="left">
              <button
                type="button"
                aria-label={t("website.pane.open")}
                aria-expanded={false}
                onClick={() => showPane(true)}
                className={
                  "flex h-full w-9 items-center justify-center text-fg-muted"
                  + " transition-colors hover:bg-raised hover:text-fg focus-visible:outline"
                  + " focus-visible:outline-2 focus-visible:-outline-offset-2"
                  + " focus-visible:outline-primary"
                }
              >
                <PanelRight className="size-4" aria-hidden />
              </button>
            </Tooltip>
          </div>
        )}
      </div>
      )}

      {/* The first thing a church is told, once. */}
      {tip ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div
            className={
              "pointer-events-auto flex items-center gap-3 rounded-full border border-line"
              + " bg-surface px-4 py-2.5 text-sm shadow-lg"
            }
          >
            <span className="text-fg">{t("website.firstTip")}</span>
            <Button
              variant="secondary"
              onClick={() => {
                setTip(false);
                try {
                  window.localStorage.setItem(TIP_SEEN, "yes");
                } catch {
                  /* Nothing to remember in a private window. */
                }
              }}
            >
              {t("website.gotIt")}
            </Button>
          </div>
        </div>
      ) : null}

      <Working open={uploads > 0} label={t("website.uploadingMedia")} />

      {/* Adding a section. */}
      <Sheet open={library !== null} onOpenChange={(open) => { if (!open) setLibrary(null); }}>
        <SheetContent
          title={t("website.library.title")}
          closeLabel={t("website.panel.close")}
          width="760px"
        >
          {library !== null ? (
            <Library api={api} at={library} onClose={() => setLibrary(null)} />
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Changing one section's layout. */}
      <Dialog open={layoutFor !== null} onOpenChange={(open) => { if (!open) setLayoutFor(null); }}>
        <DialogContent title={t("website.changeLayout")} closeLabel={t("website.panel.close")}>
          {layoutFor ? (
            <LayoutChooser api={api} sectionId={layoutFor} onClose={() => setLayoutFor(null)} />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Where a link in a paragraph goes. */}
      <LinkDialog
        at={linkAt}
        onClose={() => setLinkAt(null)}
      />

      {/* Publishing. */}
      <Dialog open={publishAsk} onOpenChange={setPublishAsk}>
        <DialogContent
          title={state.publishedAt ? t("website.publishChanges") : t("website.publishTitle")}
        >
          <div className="flex flex-col gap-4">
            {church.liveUrl ? (
              <p className="m-0 text-sm text-fg-muted">
                {t("website.publishWhere", { address: church.liveUrl })}
              </p>
            ) : (
              <Banner tone="warning">{t("website.settings.address")}</Banner>
            )}
            <Field label={t("website.publishNote")} htmlFor="publish-note">
              <Input
                id="publish-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={200}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPublishAsk(false)}>
              {t("website.gallery.closePreview")}
            </Button>
            <Button onClick={doPublish} disabled={publishing} aria-busy={publishing}>
              {state.publishedAt ? t("website.publishChanges") : t("website.publishNow")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Where a link inside a paragraph goes.
 *
 * Typing applies the mark through the browser's own command, which needs an
 * address at the moment it runs, so the dialog asks for one and then applies it
 * to whatever was selected.
 */
function LinkDialog({
  at,
  onClose,
}: {
  at: { sectionId: string; path: string } | null;
  onClose: () => void;
}) {
  const [url, setUrl] = React.useState("");
  const [bad, setBad] = React.useState(false);

  React.useEffect(() => {
    if (at) {
      setUrl("");
      setBad(false);
    }
  }, [at]);

  const apply = () => {
    const held = url.trim();
    if (!/^https:\/\/\S+\.\S+/.test(held)) {
      setBad(true);
      return;
    }
    document.execCommand("createLink", false, held);
    onClose();
  };

  return (
    <Dialog open={at !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent title={t("website.addLink")}>
        <Field
          label={t("website.field.external")}
          htmlFor="rich-link"
          {...(bad ? { error: t("website.error.webAddress") } : {})}
        >
          <Input
            id="rich-link"
            value={url}
            inputMode="url"
            onChange={(event) => {
              setUrl(event.target.value);
              setBad(false);
            }}
          />
        </Field>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {t("website.gallery.closePreview")}
          </Button>
          <Button onClick={apply}>{t("website.addLink")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

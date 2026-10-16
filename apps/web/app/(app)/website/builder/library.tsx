"use client";

/**
 * HRT-381, R22.2. Choosing a section, and choosing a layout for one.
 *
 * Every thumbnail in here is the section itself. The real component, the
 * church's own theme, the words it will open with, rendered on a stage 1280px
 * wide and scaled down to the size of a card. A drawing of a section goes out
 * of date the week somebody changes the section, and the church then picks the
 * drawing and gets something else.
 *
 * The stage is `pointer-events: none`, `aria-hidden` and `inert`, so the
 * website inside a thumbnail is a picture as far as the mouse, the keyboard
 * and a screen reader are concerned: the card around it is the control, and it
 * carries the words.
 */

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { t } from "@connectapp/i18n";
import { SECTION_CATEGORIES } from "@connectapp/db/rules";
import type { SiteDoc, SiteSection } from "@connectapp/db/rules";
import { cn } from "@connectapp/ui";
import { SearchField } from "@/components/search-field";
import { SectionView, SiteFrame } from "@/components/church-site/page-view";
import type { SiteCtx } from "@/components/church-site/kit";
import { categoryLabel, kindOf, SECTION_KINDS } from "@/components/church-site/registry";
import { newSection } from "@/components/church-site/starter";
import type { BuilderApi } from "./api";
import { addSection, sectionOf, setVariant } from "./store";

/* ----------------------------------------------------------- the stage --- */

/**
 * The width every preview is composed at.
 *
 * A section is laid out at a desktop width and then scaled by a transform, so
 * what a card shows is the desktop composition made small. Laying it out at
 * the card's own width instead would hit the section's own breakpoints and
 * show the phone layout, which is not what a church is choosing between.
 */
const STAGE_WIDTH = 1280;

/** How much of the page one thumbnail holds, at stage scale. */
const STAGE_HEIGHT = 800;

type Size = { width: number; height: number };

/*
 * One observer for every stage on the screen.
 *
 * Seventy thumbnails means seventy boxes to measure, and seventy
 * ResizeObservers each with their own callback into the browser's layout work
 * is seventy times the bookkeeping for one number that is the same on most of
 * them.
 */
let observer: ResizeObserver | null = null;
const watchers = new WeakMap<Element, (size: Size) => void>();

function watch(element: Element, report: (size: Size) => void): () => void {
  observer ??= new ResizeObserver((entries) => {
    for (const entry of entries) {
      watchers.get(entry.target)?.({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    }
  });
  watchers.set(element, report);
  observer.observe(element);
  return () => {
    watchers.delete(element);
    observer?.unobserve(element);
  };
}

/*
 * A stage builds its section only once the box is near enough to be read.
 *
 * A search that matches most of the catalogue opens every category at once,
 * and a panel 760px wide shows four cards of it. Drawing the other sixty-six
 * websites is work nobody sees, so each box waits until it is within a screen
 * of the one being read, and then keeps what it drew.
 */
let watcher: IntersectionObserver | null = null;
const comers = new WeakMap<Element, () => void>();

function near(element: Element, arrive: () => void): () => void {
  watcher ??= new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) comers.get(entry.target)?.();
    }
  }, { rootMargin: "600px" });
  comers.set(element, arrive);
  watcher.observe(element);
  return () => {
    comers.delete(element);
    watcher?.unobserve(element);
  };
}

function useStageBox<T extends HTMLElement>(): [React.RefObject<T | null>, Size, boolean] {
  const ref = React.useRef<T | null>(null);
  const [size, setSize] = React.useState<Size>({ width: 0, height: 0 });
  const [seen, setSeen] = React.useState(false);
  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;
    return watch(element, (next) => {
      setSize((held) =>
        (held.width === next.width && held.height === next.height ? held : next));
    });
  }, []);
  React.useEffect(() => {
    const element = ref.current;
    if (!element || seen) return;
    return near(element, () => setSeen(true));
  }, [seen]);
  return [ref, size, seen];
}

/** One section, drawn small, inside a box of the card's own size. */
function Stage({
  doc,
  site,
  section,
  className,
}: {
  doc: SiteDoc;
  site: SiteCtx;
  section: SiteSection;
  className?: string;
}) {
  const [ref, size, seen] = useStageBox<HTMLDivElement>();
  const scale = size.width > 0 ? size.width / STAGE_WIDTH : 0;
  return (
    <div
      ref={ref}
      className={cn(
        "relative aspect-[8/5] w-full overflow-hidden rounded-md border border-line bg-sunken",
        className,
      )}
    >
      <div
        aria-hidden
        inert
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: STAGE_WIDTH,
          height: STAGE_HEIGHT,
          transform: `scale(${scale})`,
          pointerEvents: "none",
          /* A grid inside a section cannot reflow the panel around it. */
          contain: "content",
          visibility: scale > 0 && seen ? "visible" : "hidden",
        }}
      >
        {seen ? (
          <SiteFrame doc={doc} className="min-h-full">
            <SectionView section={section} site={site} />
          </SiteFrame>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------- the starting sections --- */

/*
 * Seventy sections, each with its starting words, built once for the life of
 * the screen rather than once per render. A keystroke in the search box
 * rebuilt all of them, and that is felt.
 */
const built = new Map<string, SiteSection>();

function startingSection(type: string, variant: string, name: string): SiteSection {
  const at = `${type}|${variant}|${name}`;
  let held = built.get(at);
  if (!held) {
    held = newSection(type, variant, { name });
    built.set(at, held);
  }
  return held;
}

/** A section of this kind and this layout, as the church would first get it. */
export function Thumb({
  type,
  variant,
  site,
  className,
}: {
  type: string;
  variant: string;
  site: SiteCtx;
  className?: string;
}) {
  const section = React.useMemo(
    () => startingSection(type, variant, site.name),
    [type, variant, site.name],
  );
  const shown = React.useMemo<SiteCtx>(() => ({ ...site, editing: false }), [site]);
  return <Stage doc={site.doc} site={shown} section={section} className={className} />;
}

/* ---------------------------------------------------------- the browser --- */

/*
 * The card is a box and the words inside it are the control.
 *
 * The whole card presses, through an overlay on the words rather than a button
 * wrapped around the thumbnail: a section carries its own links and its own
 * buttons, and a button around those is markup a browser is entitled to take
 * apart. The focus ring is drawn on the card, so what the keyboard lands on is
 * the thing the eye reads.
 */
const CARD =
  "relative flex flex-col gap-2 rounded-lg border border-line bg-surface p-2"
  + " transition-colors duration-fast ease-out hover:bg-sunken"
  + " has-[:focus-visible]:outline has-[:focus-visible]:outline-2"
  + " has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary";

const CARD_PRESS =
  "cursor-pointer text-left after:absolute after:inset-0 after:rounded-lg"
  + " focus-visible:outline-none";

/** Every kind of section, every layout of each, grouped the way a church reads them. */
export function Library({
  api,
  at,
  onClose,
}: {
  api: BuilderApi;
  at: number;
  onClose: () => void;
}) {
  const [query, setQuery] = React.useState("");
  const needle = query.trim().toLowerCase();
  const [opened, setOpened] = React.useState<Record<string, boolean>>(
    () => ({ [SECTION_CATEGORIES[0]]: true }),
  );

  const site = React.useMemo<SiteCtx>(() => ({ ...api.site, editing: false }), [api.site]);

  const groups = React.useMemo(() => SECTION_CATEGORIES.map((category) => {
    const label = categoryLabel(category);
    const kinds = SECTION_KINDS
      .filter((kind) => kind.category === category)
      .map((kind) => ({
        kind,
        /* A kind whose own name or category matches shows all of its layouts,
           so searching "welcome" gives six welcomes rather than none. */
        variants: needle
          ? kind.variants.filter((variant) =>
              `${kind.label} ${label} ${variant.label}`.toLowerCase().includes(needle))
          : kind.variants,
      }))
      .filter((one) => one.variants.length > 0);
    return { category, label, kinds };
  }).filter((group) => group.kinds.length > 0), [needle]);

  const add = (type: string, variant: string) => {
    const section = api.newSection(type, variant);
    api.change(addSection(api.doc, api.pageId, section, at));
    api.select({ sectionId: section.id, path: "" });
    onClose();
  };

  return (
    <div className="flex flex-col gap-5">
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder={t("website.library.search")}
        className="max-w-none"
      />

      {groups.length === 0 ? (
        <p className="text-body text-fg-muted">{t("website.library.nothing")}</p>
      ) : null}

      {groups.map((group) => {
        const open = needle ? true : Boolean(opened[group.category]);
        return (
          <section key={group.category} className="flex flex-col gap-3">
            {/* While something is typed every matching category is open, so
                the heading is a heading. A press that changed nothing reads
                as a control that is broken. */}
            <h3 className="text-label text-fg">
              {needle ? (
                <span className="block px-1 py-1">{group.label}</span>
              ) : (
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpened((held) => ({
                    ...held, [group.category]: !held[group.category],
                  }))}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between gap-2 rounded-md",
                    "px-1 py-1 transition-colors duration-fast ease-out",
                    "hover:bg-sunken focus-visible:outline focus-visible:outline-2",
                    "focus-visible:outline-offset-2 focus-visible:outline-primary",
                  )}
                >
                  {group.label}
                  <ChevronDown
                    className={cn(
                      "size-4 text-fg-muted transition-transform",
                      open && "rotate-180",
                    )}
                    aria-hidden
                  />
                </button>
              )}
            </h3>

            {/* A closed category draws none of its sections, which is the
                difference between seventy live pages and six. */}
            {open ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {group.kinds.flatMap(({ kind, variants }) => variants.map((variant) => (
                  <div key={`${kind.type}.${variant.key}`} className={CARD}>
                    <Thumb type={kind.type} variant={variant.key} site={site} />
                    <button
                      type="button"
                      onClick={() => add(kind.type, variant.key)}
                      className={CARD_PRESS}
                    >
                      <span className="block text-label text-fg">{variant.label}</span>
                      <span className="block text-caption text-fg-muted">{kind.label}</span>
                    </button>
                  </div>
                )))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------- the layout chooser --- */

/** The layouts one section can take, each carrying that section's own words. */
export function LayoutChooser({
  api,
  sectionId,
  onClose,
}: {
  api: BuilderApi;
  sectionId: string;
  onClose: () => void;
}) {
  const section = sectionOf(api.doc, api.pageId, sectionId);
  const kind = section ? kindOf(section.type) : undefined;

  const site = React.useMemo<SiteCtx>(() => ({ ...api.site, editing: false }), [api.site]);
  const shown = React.useMemo(
    () => (section && kind
      ? kind.variants.map((variant) => ({
          variant,
          section: { ...section, variant: variant.key } as SiteSection,
        }))
      : []),
    [section, kind],
  );

  if (!section || !kind) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {shown.map((one) => {
        const here = one.variant.key === section.variant;
        return (
          <div
            key={one.variant.key}
            className={cn(CARD, here && "border-accent ring-2 ring-accent")}
          >
            <Stage doc={api.doc} site={site} section={one.section} />
            <button
              type="button"
              aria-current={here ? "true" : undefined}
              onClick={() => {
                api.change(setVariant(api.doc, api.pageId, sectionId, one.variant.key));
                onClose();
              }}
              className={CARD_PRESS}
            >
              <span className="block text-label text-fg">{one.variant.label}</span>
              <span className="block text-caption text-fg-muted">{kind.label}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

"use client";

/**
 * HRT-378, HRT-384, R22.2. What the editor is holding, and every way it changes.
 *
 * One reducer over one document, with a history either side of it. Every change
 * a church can make goes through here, which is what makes undo cover all of
 * them rather than the three somebody remembered to wire up.
 *
 * Typing is coalesced: a run of keystrokes inside one field collapses into one
 * entry, so Ctrl+Z steps back a sentence rather than a letter. Anything else
 * (adding a section, moving one, changing a colour, replacing a picture) is its
 * own entry.
 */

import type {
  PageStarter,
} from "@/components/church-site/starter";
import type {
  SectionStyle, SiteDoc, SiteImage, SitePage, SiteSection, SiteTheme,
} from "@connectapp/db/rules";

export type Device = "desk" | "tablet" | "phone";
export type Panel = "pages" | "add" | "design" | "media" | "settings";
export type SaveState = "clean" | "dirty" | "saving" | "saved" | "failed" | "conflict";

/** Where the header and the footer live, for a selection that names one. */
export const HEADER = "__header";
export const FOOTER = "__footer";

export interface Selection {
  /** A section's id, or HEADER or FOOTER. */
  sectionId: string;
  /** The field inside it, as a path. Empty means the whole thing. */
  path: string;
}

export interface State {
  doc: SiteDoc;
  version: number;
  pageId: string;
  selected: Selection | null;
  device: Device;
  panel: Panel | null;
  save: SaveState;
  error: string | null;
  past: SiteDoc[];
  future: SiteDoc[];
  /** Set while a run of typing is open, so the next keystroke merges. */
  typing: string | null;
  /** Whether the church has published since this screen opened. */
  publishedAt: string | null;
  /** True when the draft says something the live copy does not. */
  changed: boolean;
}

export type Action =
  | { kind: "select"; selection: Selection | null }
  | { kind: "panel"; panel: Panel | null }
  | { kind: "device"; device: Device }
  | { kind: "page"; pageId: string }
  /** A change to the document. `merge` joins it to the entry before it. */
  | { kind: "doc"; doc: SiteDoc; merge?: string }
  | { kind: "undo" }
  | { kind: "redo" }
  | { kind: "saving" }
  | { kind: "saved"; version: number }
  | { kind: "failed"; error: string }
  | { kind: "conflict"; error: string }
  | { kind: "published"; at: string | null }
  | { kind: "replace"; doc: SiteDoc; version: number };

const LIMIT = 60;

export function reduce(state: State, action: Action): State {
  switch (action.kind) {
    case "select":
      return { ...state, selected: action.selection, typing: null };
    case "panel":
      return { ...state, panel: action.panel };
    case "device":
      return { ...state, device: action.device, selected: null };
    case "page":
      return { ...state, pageId: action.pageId, selected: null, typing: null };

    case "doc": {
      const merging = Boolean(action.merge) && state.typing === action.merge;
      return {
        ...state,
        doc: action.doc,
        past: merging ? state.past : [...state.past, state.doc].slice(-LIMIT),
        future: [],
        typing: action.merge ?? null,
        save: "dirty",
        error: null,
        changed: true,
      };
    }

    case "undo": {
      const previous = state.past[state.past.length - 1];
      if (!previous) return state;
      return {
        ...state,
        doc: previous,
        past: state.past.slice(0, -1),
        future: [state.doc, ...state.future].slice(0, LIMIT),
        save: "dirty",
        typing: null,
        /* The selection may name a section the step back removed. */
        selected: null,
      };
    }

    case "redo": {
      const next = state.future[0];
      if (!next) return state;
      return {
        ...state,
        doc: next,
        past: [...state.past, state.doc].slice(-LIMIT),
        future: state.future.slice(1),
        save: "dirty",
        typing: null,
        selected: null,
      };
    }

    case "saving":
      return { ...state, save: "saving" };
    case "saved":
      return { ...state, save: "saved", version: action.version, error: null };
    case "failed":
      return { ...state, save: "failed", error: action.error };
    case "conflict":
      return { ...state, save: "conflict", error: action.error };
    case "published":
      return { ...state, publishedAt: action.at, changed: false };
    case "replace":
      return {
        ...state,
        doc: action.doc,
        version: action.version,
        save: "clean",
        error: null,
        past: [],
        future: [],
        selected: null,
        typing: null,
        pageId: action.doc.pages.some((one) => one.id === state.pageId)
          ? state.pageId
          : action.doc.homeId,
      };
  }
}

export const canUndo = (state: State): boolean => state.past.length > 0;
export const canRedo = (state: State): boolean => state.future.length > 0;

/* --------------------------------------------------------------- the paths --- */

/** Reads a value out of a content object by its dotted path. */
export function atPath(held: unknown, path: string): unknown {
  if (!path) return held;
  let here: unknown = held;
  for (const step of path.split(".")) {
    if (here === null || here === undefined) return undefined;
    if (Array.isArray(here)) {
      const index = Number(step);
      here = Number.isInteger(index) ? here[index] : undefined;
    } else if (typeof here === "object") {
      here = (here as Record<string, unknown>)[step];
    } else {
      return undefined;
    }
  }
  return here;
}

/** The same object with one path changed, and nothing else touched. */
export function withPath<T>(held: T, path: string, value: unknown): T {
  if (!path) return value as T;
  const [step, ...rest] = path.split(".");
  const key = step!;
  const deeper = rest.join(".");
  if (Array.isArray(held)) {
    const index = Number(key);
    if (!Number.isInteger(index)) return held;
    const copy = [...held];
    copy[index] = deeper ? withPath(copy[index], deeper, value) : value;
    return copy as unknown as T;
  }
  const one = (held ?? {}) as Record<string, unknown>;
  return {
    ...one,
    [key]: deeper ? withPath(one[key], deeper, value) : value,
  } as T;
}

/* -------------------------------------------------------- changing the doc --- */

export const pageOf = (doc: SiteDoc, pageId: string): SitePage =>
  doc.pages.find((one) => one.id === pageId) ?? doc.pages[0]!;

export const sectionOf = (
  doc: SiteDoc, pageId: string, sectionId: string,
): SiteSection | undefined =>
  pageOf(doc, pageId).sections.find((one) => one.id === sectionId);

const mapPages = (
  doc: SiteDoc, pageId: string, change: (page: SitePage) => SitePage,
): SiteDoc => ({
  ...doc,
  pages: doc.pages.map((page) => (page.id === pageId ? change(page) : page)),
});

const mapSections = (
  doc: SiteDoc,
  pageId: string,
  change: (sections: SiteSection[]) => SiteSection[],
): SiteDoc => mapPages(doc, pageId, (page) => ({ ...page, sections: change(page.sections) }));

/**
 * One field of one section.
 *
 * A path beginning `style.` writes the section's own styling rather than its
 * content, which is what lets one picture control serve a hero's photograph and
 * a band's background picture without either side knowing the difference.
 */
export function setField(
  doc: SiteDoc, pageId: string, sectionId: string, path: string, value: unknown,
): SiteDoc {
  if (sectionId === HEADER || sectionId === FOOTER) {
    const root = sectionId === HEADER ? "header" : "footer";
    return withPath(doc, path ? `${root}.${path}` : root, value);
  }
  if (path.startsWith("style.")) {
    const inner = path.slice("style.".length);
    return mapSections(doc, pageId, (sections) => sections.map((one) =>
      one.id === sectionId
        ? { ...one, style: withPath(one.style ?? {}, inner, value) }
        : one,
    ));
  }
  return mapSections(doc, pageId, (sections) => sections.map((one) =>
    one.id === sectionId ? { ...one, content: withPath(one.content, path, value) } : one,
  ));
}

export function setVariant(
  doc: SiteDoc, pageId: string, sectionId: string, variant: string,
): SiteDoc {
  return mapSections(doc, pageId, (sections) => sections.map((one) =>
    one.id === sectionId ? { ...one, variant } : one,
  ));
}

export function setStyle(
  doc: SiteDoc, pageId: string, sectionId: string, style: SectionStyle,
): SiteDoc {
  return mapSections(doc, pageId, (sections) => sections.map((one) =>
    one.id === sectionId ? { ...one, style } : one,
  ));
}

export function setBinding(
  doc: SiteDoc, pageId: string, sectionId: string, bind: SiteSection["bind"],
): SiteDoc {
  return mapSections(doc, pageId, (sections) => sections.map((one) =>
    one.id === sectionId ? { ...one, ...(bind ? { bind } : {}) } : one,
  ));
}

export function toggleHidden(
  doc: SiteDoc, pageId: string, sectionId: string,
): SiteDoc {
  return mapSections(doc, pageId, (sections) => sections.map((one) =>
    one.id === sectionId ? { ...one, hidden: !one.hidden } : one,
  ));
}

export function addSection(
  doc: SiteDoc, pageId: string, section: SiteSection, at: number,
): SiteDoc {
  return mapSections(doc, pageId, (sections) => {
    const copy = [...sections];
    copy.splice(Math.max(0, Math.min(at, copy.length)), 0, section);
    return copy;
  });
}

export function removeSection(
  doc: SiteDoc, pageId: string, sectionId: string,
): SiteDoc {
  return mapSections(doc, pageId, (sections) =>
    sections.filter((one) => one.id !== sectionId));
}

export function duplicateSection(
  doc: SiteDoc, pageId: string, sectionId: string, newId: string,
): SiteDoc {
  return mapSections(doc, pageId, (sections) => {
    const at = sections.findIndex((one) => one.id === sectionId);
    if (at < 0) return sections;
    const copy = [...sections];
    copy.splice(at + 1, 0, { ...sections[at]!, id: newId });
    return copy;
  });
}

export function moveSection(
  doc: SiteDoc, pageId: string, from: number, to: number,
): SiteDoc {
  return mapSections(doc, pageId, (sections) => {
    if (to < 0 || to >= sections.length || from === to) return sections;
    const copy = [...sections];
    const [held] = copy.splice(from, 1);
    if (held) copy.splice(to, 0, held);
    return copy;
  });
}

/** A repeated row: a value, a card, a question. */
export function addRow(
  doc: SiteDoc, pageId: string, sectionId: string, path: string, row: unknown,
): SiteDoc {
  const section = sectionOf(doc, pageId, sectionId);
  if (!section) return doc;
  const held = atPath(section.content, path);
  const rows = Array.isArray(held) ? held : [];
  return setField(doc, pageId, sectionId, path, [...rows, row]);
}

export function removeRow(
  doc: SiteDoc, pageId: string, sectionId: string, path: string, index: number,
): SiteDoc {
  const section = sectionOf(doc, pageId, sectionId);
  if (!section) return doc;
  const held = atPath(section.content, path);
  const rows = Array.isArray(held) ? held : [];
  return setField(
    doc, pageId, sectionId, path,
    rows.filter((_, at) => at !== index),
  );
}

export function moveRow(
  doc: SiteDoc, pageId: string, sectionId: string, path: string,
  from: number, to: number,
): SiteDoc {
  const section = sectionOf(doc, pageId, sectionId);
  if (!section) return doc;
  const held = atPath(section.content, path);
  const rows = Array.isArray(held) ? [...held] : [];
  if (to < 0 || to >= rows.length) return doc;
  const [one] = rows.splice(from, 1);
  rows.splice(to, 0, one);
  return setField(doc, pageId, sectionId, path, rows);
}

/* ------------------------------------------------------------- the whole --- */

export const setTheme = (doc: SiteDoc, theme: SiteTheme): SiteDoc => ({ ...doc, theme });

export const setSeo = (doc: SiteDoc, seo: SiteDoc["seo"]): SiteDoc => ({ ...doc, seo });

export const setSocial = (doc: SiteDoc, social: SiteDoc["social"]): SiteDoc =>
  ({ ...doc, social });

export function setPage(
  doc: SiteDoc, pageId: string, change: Partial<SitePage>,
): SiteDoc {
  return mapPages(doc, pageId, (page) => ({ ...page, ...change }));
}

export function addPage(doc: SiteDoc, page: SitePage): SiteDoc {
  return { ...doc, pages: [...doc.pages, page] };
}

export function removePage(doc: SiteDoc, pageId: string): SiteDoc {
  if (pageId === doc.homeId || doc.pages.length < 2) return doc;
  return { ...doc, pages: doc.pages.filter((one) => one.id !== pageId) };
}

export function movePage(doc: SiteDoc, from: number, to: number): SiteDoc {
  if (to < 0 || to >= doc.pages.length || from === to) return doc;
  const pages = [...doc.pages];
  const [one] = pages.splice(from, 1);
  if (one) pages.splice(to, 0, one);
  return { ...doc, pages };
}

/**
 * Makes a page the one served at the church's own address.
 *
 * The page that was home takes an address of its own, from its name, so it does
 * not become unreachable. A name that gives nothing usable falls back to its
 * position, which is ugly and findable rather than silent.
 */
export function setHome(doc: SiteDoc, pageId: string): SiteDoc {
  if (pageId === doc.homeId) return doc;
  const wanted = doc.pages.find((one) => one.id === pageId);
  if (!wanted) return doc;
  const taken = new Set(doc.pages.map((one) => one.slug).filter(Boolean));
  const stem = slugFrom(doc.pages.find((one) => one.id === doc.homeId)?.title ?? "page");
  let slug = stem;
  let n = 1;
  while (!slug || taken.has(slug)) {
    n += 1;
    slug = `${stem || "page"}-${n}`;
  }
  return {
    ...doc,
    homeId: pageId,
    pages: doc.pages.map((one) => {
      if (one.id === pageId) return { ...one, slug: "", inNav: true };
      if (one.id === doc.homeId) return { ...one, slug };
      return one;
    }),
  };
}

/** A page's name, as an address. */
export function slugFrom(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 62);
}

export function duplicatePage(
  doc: SiteDoc, pageId: string, ids: { page: string; sections: string[] },
): SiteDoc {
  const page = doc.pages.find((one) => one.id === pageId);
  if (!page) return doc;
  const taken = new Set(doc.pages.map((one) => one.slug).filter(Boolean));
  let slug = `${page.slug || "page"}-copy`;
  let n = 1;
  while (taken.has(slug)) {
    n += 1;
    slug = `${page.slug || "page"}-copy-${n}`;
  }
  return addPage(doc, {
    ...page,
    id: ids.page,
    slug,
    sections: page.sections.map((one, at) => ({ ...one, id: ids.sections[at] ?? one.id })),
  });
}

/** Whether a picture is one of the church's own stored objects. */
export const isStored = (image: SiteImage | null): boolean => Boolean(image?.key);

export type { PageStarter };

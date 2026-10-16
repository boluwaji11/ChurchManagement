/**
 * HRT-379, R22.2. What kinds of section a church can put on a page.
 *
 * Each kind is described once: the fields its content carries, the layouts it
 * can be drawn in, and whether it can read from the church instead of from its
 * own content. The guard in `site-doc.ts` validates a section by looking it up
 * here, the editor reads the same description to decide which controls to draw,
 * and the renderer in the web app reads it to know what it is holding. One
 * description, three readers.
 *
 * The starting copy for a new section does not live here. It is user-facing
 * text, so it comes out of the catalogue in `packages/i18n` where every other
 * string on a screen comes from, and the web app assembles it. This file is
 * pure shape.
 */

import { InvalidInputError } from "../errors";
import {
  cleanImage, cleanLink, cleanRich, type Rich, type SiteImage, type SiteLink,
} from "./site-doc";

const bad = (): never => { throw new InvalidInputError("website.error.sections"); };

/* ---------------------------------------------------------------- fields --- */

export type SiteField =
  /** A single line. A heading, a name, a label. */
  | { kind: "line"; max?: number }
  /** A paragraph, carrying bold, italic and links. */
  | { kind: "rich" }
  | { kind: "image" }
  | { kind: "link" }
  | { kind: "links"; max: number }
  | { kind: "images"; max: number }
  | { kind: "flag" }
  | { kind: "choice"; of: readonly string[] }
  | { kind: "count"; low: number; high: number }
  /** A repeatable row: a value, a card, a question and its answer. */
  | { kind: "rows"; max: number; of: Record<string, SiteField> };

export type FieldShape = Record<string, SiteField>;

export interface SectionKind {
  /** Where it sits in the library a church browses. */
  category:
    | "welcome" | "about" | "visiting" | "community" | "events"
    | "media" | "giving" | "contact" | "general";
  fields: FieldShape;
  /** Every layout this kind can be drawn in. The first is its default. */
  variants: readonly string[];
  /** What it may read from the church, where it can read anything at all. */
  binds?: readonly ("manual" | "serviceTimes" | "events" | "groups" | "funds" | "form")[];
  /** Kinds that hold nothing but their own spacing. */
  bare?: true;
}

const line = (max = 160): SiteField => ({ kind: "line", max });
const rich = (): SiteField => ({ kind: "rich" });
const image = (): SiteField => ({ kind: "image" });
const link = (): SiteField => ({ kind: "link" });
const flag = (): SiteField => ({ kind: "flag" });

/** The heading, standfirst and eyebrow nearly every section opens with. */
const head: FieldShape = {
  eyebrow: line(60),
  title: line(200),
  body: rich(),
};

/* ------------------------------------------------------------ the catalogue --- */

export const SITE_SECTIONS: Record<string, SectionKind> = {
  /* --- welcome ------------------------------------------------------------ */
  hero: {
    category: "welcome",
    variants: ["split", "photo", "centred", "immersive", "typographic", "times"],
    fields: {
      ...head,
      image: image(),
      primary: link(),
      secondary: link(),
      /** Drawn under the buttons on the layouts that carry it. */
      note: line(120),
    },
    binds: ["manual", "serviceTimes"],
  },

  /* --- about -------------------------------------------------------------- */
  intro: {
    category: "about",
    variants: ["centred", "twoColumn", "lead"],
    fields: { ...head, action: link() },
  },
  textImage: {
    category: "about",
    variants: ["imageRight", "imageLeft", "imageAbove", "overlap"],
    fields: { ...head, image: image(), action: link() },
  },
  values: {
    category: "about",
    variants: ["threeCards", "fourCards", "list", "numbered"],
    fields: {
      ...head,
      items: {
        kind: "rows",
        max: 12,
        of: { title: line(120), body: rich(), icon: line(40), image: image() },
      },
    },
  },
  people: {
    category: "about",
    variants: ["cards", "featured", "rows"],
    fields: {
      ...head,
      items: {
        kind: "rows",
        max: 24,
        of: {
          name: line(120),
          role: line(120),
          body: rich(),
          image: image(),
          action: link(),
        },
      },
    },
  },
  stats: {
    category: "about",
    variants: ["row", "cards", "band"],
    fields: {
      ...head,
      items: { kind: "rows", max: 6, of: { value: line(24), label: line(80) } },
    },
  },
  quote: {
    category: "about",
    variants: ["single", "cards", "band"],
    fields: {
      ...head,
      items: {
        kind: "rows",
        max: 9,
        of: { body: rich(), name: line(120), role: line(120), image: image() },
      },
    },
  },

  /* --- visiting ----------------------------------------------------------- */
  times: {
    category: "visiting",
    variants: ["cards", "list", "band"],
    fields: {
      ...head,
      action: link(),
      items: {
        kind: "rows",
        max: 12,
        of: { name: line(80), when: line(80), where: line(120), note: line(160) },
      },
    },
    binds: ["serviceTimes", "manual"],
  },
  visit: {
    category: "visiting",
    variants: ["steps", "cards", "withImage"],
    fields: {
      ...head,
      image: image(),
      action: link(),
      items: { kind: "rows", max: 8, of: { title: line(120), body: rich(), icon: line(40) } },
    },
  },
  location: {
    category: "visiting",
    variants: ["mapRight", "mapFull", "plain"],
    fields: {
      ...head,
      /** Written by hand only when the church's own address is not the one. */
      address: line(300),
      directions: rich(),
      showMap: flag(),
      action: link(),
    },
  },

  /* --- community ---------------------------------------------------------- */
  ministries: {
    category: "community",
    variants: ["threeCards", "featured", "rows", "editorial"],
    fields: {
      ...head,
      action: link(),
      items: {
        kind: "rows",
        max: 18,
        of: { title: line(120), body: rich(), image: image(), action: link() },
      },
    },
    binds: ["groups", "manual"],
  },

  /* --- events ------------------------------------------------------------- */
  events: {
    category: "events",
    variants: ["grid", "list", "featured"],
    fields: {
      ...head,
      action: link(),
      items: {
        kind: "rows",
        max: 12,
        of: {
          title: line(160),
          when: line(120),
          where: line(160),
          body: rich(),
          image: image(),
          action: link(),
        },
      },
    },
    binds: ["events", "manual"],
  },

  /* --- media -------------------------------------------------------------- */
  gallery: {
    category: "media",
    variants: ["grid", "mosaic", "strip"],
    fields: { ...head, items: { kind: "images", max: 24 } },
  },
  video: {
    category: "media",
    variants: ["wide", "framed", "withText"],
    fields: {
      ...head,
      /** A stored file of the church's, or an address on YouTube or Vimeo. */
      video: image(),
      embed: line(400),
      poster: image(),
      action: link(),
    },
  },

  /* --- giving ------------------------------------------------------------- */
  give: {
    category: "giving",
    variants: ["band", "split", "cards"],
    fields: {
      ...head,
      image: image(),
      action: link(),
      items: { kind: "rows", max: 9, of: { title: line(120), body: rich() } },
    },
    binds: ["funds", "manual"],
  },

  /* --- contact ------------------------------------------------------------ */
  contact: {
    category: "contact",
    variants: ["columns", "band", "withMap"],
    fields: {
      ...head,
      showAddress: flag(),
      showContact: flag(),
      showSocial: flag(),
      action: link(),
    },
  },
  form: {
    category: "contact",
    variants: ["inline", "split", "boxed"],
    fields: { ...head, image: image() },
    binds: ["form"],
  },
  social: {
    category: "contact",
    variants: ["row", "band"],
    fields: { ...head },
  },

  /* --- general ------------------------------------------------------------ */
  cta: {
    category: "general",
    variants: ["band", "boxed", "split"],
    fields: { ...head, image: image(), primary: link(), secondary: link() },
  },
  faq: {
    category: "general",
    variants: ["list", "twoColumn"],
    fields: {
      ...head,
      items: { kind: "rows", max: 24, of: { title: line(200), body: rich() } },
    },
  },
  cards: {
    category: "general",
    variants: ["threeCards", "fourCards", "twoCards"],
    fields: {
      ...head,
      items: {
        kind: "rows",
        max: 12,
        of: { title: line(120), body: rich(), image: image(), action: link() },
      },
    },
  },
  rule: {
    category: "general",
    variants: ["line", "space", "ornament"],
    fields: { height: { kind: "choice", of: ["small", "regular", "large"] } },
    bare: true,
  },
};

export type SectionTypeKey = keyof typeof SITE_SECTIONS;

/** The kinds a church browses, in the order the library shows them. */
export const SECTION_CATEGORIES = [
  "welcome", "about", "visiting", "community", "events",
  "media", "giving", "contact", "general",
] as const;

/* ------------------------------------------------------------ validation --- */

export interface CleanContent {
  title?: string;
  [key: string]: unknown;
}

function cleanField(field: SiteField, value: unknown, depth: number): unknown {
  switch (field.kind) {
    case "line": {
      if (value === undefined || value === null) return "";
      if (typeof value !== "string") bad();
      const text = value as string;
      if (text.length > (field.max ?? 160)) bad();
      return text.trim();
    }
    case "rich":
      return cleanRich(value);
    case "image":
      return cleanImage(value);
    case "link":
      return cleanLink(value);
    case "links": {
      if (!Array.isArray(value)) return [];
      if (value.length > field.max) bad();
      return value.map(cleanLink).filter((one): one is SiteLink => one !== null);
    }
    case "images": {
      if (!Array.isArray(value)) return [];
      if (value.length > field.max) bad();
      return value.map(cleanImage).filter((one): one is SiteImage => one !== null);
    }
    case "flag":
      return value === true;
    case "choice":
      return typeof value === "string" && field.of.includes(value) ? value : field.of[0];
    case "count": {
      if (typeof value !== "number" || !Number.isFinite(value)) return field.low;
      return Math.min(field.high, Math.max(field.low, Math.round(value)));
    }
    case "rows": {
      if (depth > 1) bad();
      if (!Array.isArray(value)) return [];
      if (value.length > field.max) bad();
      return value.map((row) => cleanShape(field.of, row, depth + 1));
    }
  }
}

function cleanShape(
  shape: FieldShape, value: unknown, depth: number,
): Record<string, unknown> {
  const given = (value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [name, field] of Object.entries(shape)) {
    out[name] = cleanField(field, given[name], depth);
  }
  return out;
}

/**
 * Checks one section's kind, layout and content.
 *
 * A kind nobody knows is refused rather than dropped, because a document that
 * quietly loses a section is worse than one that will not save: the church
 * would publish a page with a hole in it and never be told.
 */
export function cleanSectionContent(
  type: string,
  variant: string,
  content: unknown,
): { type: string; variant: string; content: Record<string, unknown> } {
  const kind = SITE_SECTIONS[type];
  if (!kind) bad();
  const settled = kind!.variants.includes(variant) ? variant : kind!.variants[0]!;
  return { type, variant: settled, content: cleanShape(kind!.fields, content, 0) };
}

/** An empty content object for a kind, which the editor fills with copy. */
export function blankContent(type: string): Record<string, unknown> {
  const kind = SITE_SECTIONS[type];
  if (!kind) bad();
  return cleanShape(kind!.fields, {}, 0);
}

/** Whether a kind can read from the church at all. */
export const isBindable = (type: string): boolean =>
  (SITE_SECTIONS[type]?.binds?.length ?? 0) > 1
  || (SITE_SECTIONS[type]?.binds?.[0] ?? "manual") !== "manual";

/** Convenience for the renderer, which asks for these constantly. */
export const textOf = (value: unknown): string =>
  typeof value === "string" ? value : "";
export const richOf = (value: unknown): Rich =>
  Array.isArray(value) ? value as Rich : [];
export const imageOf = (value: unknown): SiteImage | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as SiteImage : null;
export const linkOf = (value: unknown): SiteLink | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as SiteLink : null;
export const rowsOf = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value as Record<string, unknown>[] : [];
export const imagesOf = (value: unknown): SiteImage[] =>
  Array.isArray(value) ? value as SiteImage[] : [];

/**
 * HRT-380, R22.2. The six starting designs, and the words a new page opens with.
 *
 * A church choosing a design gets a finished page, not an empty canvas: its own
 * name in the hero, its own service times in the times section, its own address
 * in the footer, and sentences in every other slot that read as a draft rather
 * than as lorem ipsum. Nothing here invents a fact about the church. Where a
 * detail is unknown the sentence says what to write, and the editor shows it as
 * a placeholder until somebody does.
 *
 * The six differ in composition rather than in colour. Each one has its own
 * hero, its own type pairing, its own order of sections, its own grounds, its
 * own button language and its own spacing, which is the difference between six
 * designs and one design painted six ways.
 */

import { t, type MessageKey } from "@connectapp/i18n";
import {
  blankContent, type SiteDoc, type SiteSection, type SiteTheme,
} from "@connectapp/db/rules";

export const SITE_TEMPLATES = [
  "gathering", "community", "heritage", "vibrant", "sanctuary", "neighbourhood",
] as const;
export type TemplateKey = (typeof SITE_TEMPLATES)[number];

type Theme = SiteDoc["theme"];
type Header = SiteDoc["header"];
type Footer = SiteDoc["footer"];

/** A section in a starting design: its kind, its layout and its ground. */
interface Slot {
  type: string;
  variant: string;
  ground?: NonNullable<SiteSection["style"]>["ground"];
  pad?: NonNullable<SiteSection["style"]>["pad"];
  align?: NonNullable<SiteSection["style"]>["align"];
  bind?: SiteSection["bind"];
}

interface Template {
  key: TemplateKey;
  theme: Theme;
  header: Pick<Header, "style" | "transparent" | "sticky" | "showName">;
  footer: Pick<Footer, "style" | "showAddress" | "showContact" | "showTimes" | "showSocial">;
  home: Slot[];
}

const theme = (over: Partial<SiteTheme>): Theme => ({
  palette: "stone",
  colors: {},
  fonts: "editorial",
  typeScale: "regular",
  headingWeight: "regular",
  corners: "soft",
  buttons: { shape: "soft", secondary: "outline" },
  width: "regular",
  rhythm: "regular",
  cards: "line",
  images: "soft",
  ...over,
});

const footing = (over: Partial<Footer> = {}): Template["footer"] => ({
  style: "columns",
  showAddress: true,
  showContact: true,
  showTimes: true,
  showSocial: true,
  ...over,
});

export const TEMPLATES: Record<TemplateKey, Template> = {
  /* Warm, welcoming, editorial. A serif display over a cream ground, the hero
     split so a photograph of the building sits beside the welcome. */
  gathering: {
    key: "gathering",
    theme: theme({}),
    header: { style: "logoLeft", transparent: false, sticky: true, showName: true },
    footer: footing(),
    home: [
      { type: "hero", variant: "split" },
      { type: "intro", variant: "lead", ground: "surface" },
      { type: "times", variant: "cards", bind: { source: "serviceTimes" } },
      { type: "values", variant: "threeCards", ground: "surface" },
      { type: "ministries", variant: "threeCards", bind: { source: "groups", limit: 6 } },
      { type: "cta", variant: "band", ground: "primary" },
      { type: "contact", variant: "columns" },
    ],
  },

  /* Bold and contemporary. The hero is a photograph with the words over it and
     the header floating on top of it, then the service times as a strip of
     colour immediately underneath, which is the first thing a visitor wants. */
  community: {
    key: "community",
    theme: theme({
      palette: "forest", fonts: "grotesque", typeScale: "grand", headingWeight: "bold",
      corners: "square", buttons: { shape: "square", secondary: "soft" },
      width: "wide", rhythm: "compact", cards: "flat", images: "square",
    }),
    header: { style: "minimal", transparent: true, sticky: true, showName: true },
    footer: footing({ style: "band" }),
    home: [
      { type: "hero", variant: "photo" },
      { type: "times", variant: "band", ground: "primary", bind: { source: "serviceTimes" } },
      { type: "intro", variant: "twoColumn" },
      { type: "ministries", variant: "featured", bind: { source: "groups", limit: 6 } },
      { type: "events", variant: "grid", ground: "surface", bind: { source: "events", limit: 3 } },
      { type: "give", variant: "band", ground: "accent", bind: { source: "funds" } },
      { type: "cta", variant: "boxed" },
      { type: "contact", variant: "band", ground: "ink" },
    ],
  },

  /* Timeless. A centred mark, a narrow measure, generous air, and room for the
     church's history and the people who lead it. */
  heritage: {
    key: "heritage",
    theme: theme({
      palette: "ivory", fonts: "classical", typeScale: "regular", headingWeight: "regular",
      corners: "square", buttons: { shape: "square", secondary: "quiet" },
      width: "narrow", rhythm: "airy", cards: "line", images: "square",
    }),
    header: { style: "centred", transparent: false, sticky: false, showName: true },
    footer: footing(),
    home: [
      { type: "hero", variant: "centred", align: "centre" },
      { type: "intro", variant: "centred", align: "centre" },
      { type: "people", variant: "rows", ground: "surface" },
      { type: "times", variant: "list", bind: { source: "serviceTimes" } },
      { type: "values", variant: "numbered" },
      { type: "quote", variant: "single", ground: "surface", align: "centre" },
      { type: "contact", variant: "columns" },
    ],
  },

  /* Energetic. A full-screen hero, a mosaic of photographs, pills for buttons
     and shadows under the cards. */
  vibrant: {
    key: "vibrant",
    theme: theme({
      palette: "clay", fonts: "geometric", typeScale: "grand", headingWeight: "medium",
      corners: "round", buttons: { shape: "pill", secondary: "soft" },
      width: "wide", rhythm: "regular", cards: "shadow", images: "round",
    }),
    header: { style: "stacked", transparent: true, sticky: true, showName: true },
    footer: footing({ style: "band" }),
    home: [
      { type: "hero", variant: "immersive" },
      { type: "values", variant: "fourCards" },
      { type: "gallery", variant: "mosaic", ground: "surface" },
      { type: "events", variant: "featured", bind: { source: "events", limit: 4 } },
      { type: "ministries", variant: "rows", bind: { source: "groups", limit: 6 } },
      { type: "give", variant: "split", ground: "surface", bind: { source: "funds" } },
      { type: "social", variant: "band", ground: "primary", align: "centre" },
      { type: "cta", variant: "band", ground: "accent" },
    ],
  },

  /* Calm. Words alone in the hero, a light display weight, a narrow measure and
     a great deal of air. The quietest of the six. */
  sanctuary: {
    key: "sanctuary",
    theme: theme({
      palette: "sand", fonts: "literary", typeScale: "compact", headingWeight: "light",
      corners: "round", buttons: { shape: "pill", secondary: "quiet" },
      width: "narrow", rhythm: "airy", cards: "flat", images: "round",
    }),
    header: { style: "minimal", transparent: false, sticky: false, showName: true },
    footer: footing({ style: "simple", showTimes: false }),
    home: [
      { type: "hero", variant: "typographic", align: "centre" },
      { type: "rule", variant: "ornament", pad: "compact" },
      { type: "intro", variant: "centred", align: "centre" },
      { type: "times", variant: "list", bind: { source: "serviceTimes" } },
      { type: "quote", variant: "band", ground: "surface", align: "centre" },
      { type: "visit", variant: "steps" },
      { type: "contact", variant: "band", ground: "primary" },
    ],
  },

  /* Friendly. The hero carries the service times inside it, visiting comes
     before anything about the church, and the questions a first-time visitor
     actually asks are on the home page. */
  neighbourhood: {
    key: "neighbourhood",
    theme: theme({
      palette: "harbour", fonts: "humanist", typeScale: "regular", headingWeight: "medium",
      corners: "soft", buttons: { shape: "soft", secondary: "soft" },
      width: "regular", rhythm: "regular", cards: "shadow", images: "soft",
    }),
    header: { style: "logoLeft", transparent: false, sticky: true, showName: true },
    footer: footing(),
    home: [
      { type: "hero", variant: "times", bind: { source: "serviceTimes" } },
      { type: "visit", variant: "cards" },
      { type: "ministries", variant: "threeCards", ground: "surface", bind: { source: "groups", limit: 6 } },
      { type: "events", variant: "list", bind: { source: "events", limit: 4 } },
      { type: "cards", variant: "threeCards" },
      { type: "faq", variant: "list", ground: "surface" },
      { type: "give", variant: "cards", bind: { source: "funds" } },
      { type: "contact", variant: "withMap" },
    ],
  },
};

/* ------------------------------------------------------- the starting words --- */

const rich = (text: string) => (text ? [{ t: text }] : []);
const say = (key: string, values?: Record<string, string>) =>
  t(key as MessageKey, values as never);

export interface StarterChurch {
  name: string;
}

/**
 * What a section says the moment it is added.
 *
 * Everything a church would otherwise have to write from a blank line. The
 * repeated rows carry two or three examples so the layout is visible straight
 * away, and each one is a sentence somebody would actually keep rather than a
 * label saying "Heading".
 */
export function starterContent(
  type: string,
  church: StarterChurch,
): Record<string, unknown> {
  const base = blankContent(type);
  const head = (titleKey: string, bodyKey?: string, values?: Record<string, string>) => ({
    ...base,
    title: say(titleKey, values),
    body: bodyKey ? rich(say(bodyKey, values)) : [],
  });

  switch (type) {
    case "hero":
      return {
        ...head("website.start.hero.title", "website.start.hero.body", { church: church.name }),
        eyebrow: "",
        primary: { label: say("website.start.hero.primary"), to: { kind: "anchor", sectionId: "times" }, tone: "primary" },
        secondary: { label: say("website.start.hero.secondary"), to: { kind: "map" }, tone: "secondary" },
      };
    case "intro":
      return {
        ...head("website.start.intro.title", "website.start.intro.body"),
        action: { label: say("website.start.intro.action"), to: { kind: "none" }, tone: "quiet" },
      };
    case "textImage":
      return head("website.start.textImage.title", "website.start.textImage.body");
    case "values":
      return {
        ...head("website.start.values.title", "website.start.values.body"),
        items: [1, 2, 3].map((n) => ({
          title: say(`website.start.values.${n}.title`),
          body: rich(say(`website.start.values.${n}.body`)),
          icon: "",
          image: null,
        })),
      };
    case "people":
      return {
        ...head("website.start.people.title", "website.start.people.body"),
        items: [1, 2].map(() => ({
          name: "", role: "", body: [], image: null, action: null,
        })),
      };
    case "stats":
      return {
        ...head("website.start.stats.title"),
        items: [1, 2, 3].map(() => ({ value: "", label: "" })),
      };
    case "quote":
      return {
        ...head("website.start.quote.title"),
        items: [{ body: [], name: "", role: "", image: null }],
      };
    case "times":
      return {
        ...head("website.start.times.title", "website.start.times.body"),
        action: { label: say("website.start.times.action"), to: { kind: "map" }, tone: "secondary" },
        items: [{ name: "", when: "", where: "", note: "" }],
      };
    case "visit":
      return {
        ...head("website.start.visit.title", "website.start.visit.body"),
        action: { label: say("website.start.visit.action"), to: { kind: "map" }, tone: "primary" },
        items: [1, 2, 3].map((n) => ({
          title: say(`website.start.visit.${n}.title`),
          body: rich(say(`website.start.visit.${n}.body`)),
          icon: "",
        })),
      };
    case "location":
      return {
        ...head("website.start.location.title", "website.start.location.body"),
        address: "",
        directions: [],
        showMap: true,
        action: { label: say("website.part.directions"), to: { kind: "map" }, tone: "primary" },
      };
    case "ministries":
      return {
        ...head("website.start.ministries.title", "website.start.ministries.body"),
        action: { label: say("website.start.ministries.action"), to: { kind: "groups" }, tone: "secondary" },
        items: [1, 2, 3].map(() => ({ title: "", body: [], image: null, action: null })),
      };
    case "events":
      return {
        ...head("website.start.events.title", "website.start.events.body"),
        action: { label: say("website.start.events.action"), to: { kind: "events" }, tone: "secondary" },
        items: [],
      };
    case "gallery":
      return { ...head("website.start.gallery.title"), items: [] };
    case "video":
      return {
        ...head("website.start.video.title"),
        embed: "", video: null, poster: null, action: null,
      };
    case "give":
      return {
        ...head("website.start.give.title", "website.start.give.body"),
        action: { label: say("website.part.giveNow"), to: { kind: "give" }, tone: "primary" },
        items: [],
      };
    case "contact":
      return {
        ...head("website.start.contact.title", "website.start.contact.body"),
        showAddress: true,
        showContact: true,
        showSocial: true,
        action: { label: say("website.start.contact.action"), to: { kind: "email" }, tone: "primary" },
      };
    case "form":
      return head("website.start.form.title", "website.start.form.body");
    case "social":
      return head("website.start.social.title");
    case "cta":
      return {
        ...head("website.start.cta.title", "website.start.cta.body"),
        primary: { label: say("website.start.cta.action"), to: { kind: "map" }, tone: "primary" },
        secondary: null,
      };
    case "faq":
      return {
        ...head("website.start.faq.title"),
        items: [1, 2, 3].map((n) => ({
          title: say(`website.start.faq.${n}.title`),
          body: rich(say(`website.start.faq.${n}.body`)),
        })),
      };
    case "cards":
      return {
        ...head("website.start.cards.title", "website.start.cards.body"),
        items: [1, 2, 3].map(() => ({ title: "", body: [], image: null, action: null })),
      };
    case "rule":
      return base;
    default:
      return base;
  }
}

/* ------------------------------------------------------------- assembling --- */

let counter = 0;
/** A stable, readable id. Readable matters: it is in the in-page link. */
const newId = (stem: string): string => {
  counter += 1;
  return `${stem}-${Date.now().toString(36)}${counter.toString(36)}`;
};

export function sectionFrom(
  slot: Slot,
  church: StarterChurch,
): SiteSection {
  const style = slot.ground || slot.pad || slot.align
    ? {
        ...(slot.ground ? { ground: slot.ground } : {}),
        ...(slot.pad ? { pad: slot.pad } : {}),
        ...(slot.align ? { align: slot.align } : {}),
      }
    : undefined;
  return {
    id: slot.type === "times" ? "times" : newId(slot.type),
    type: slot.type,
    variant: slot.variant,
    content: starterContent(slot.type, church),
    ...(slot.bind ? { bind: slot.bind } : {}),
    ...(style ? { style } : {}),
  } as SiteSection;
}

/** One new section, for the library's "add" press. */
export function newSection(
  type: string,
  variant: string,
  church: StarterChurch,
): SiteSection {
  return sectionFrom({ type, variant }, church);
}

/* ------------------------------------------------------------- page starters --- */

export const PAGE_STARTERS = [
  "blank", "about", "visit", "ministries", "events", "giving", "contact", "sermons",
] as const;
export type PageStarter = (typeof PAGE_STARTERS)[number];

const STARTER_SLOTS: Record<PageStarter, Slot[]> = {
  blank: [
    { type: "intro", variant: "centred", align: "centre" },
  ],
  about: [
    { type: "hero", variant: "typographic", align: "centre", pad: "compact" },
    { type: "intro", variant: "lead" },
    { type: "values", variant: "threeCards", ground: "surface" },
    { type: "people", variant: "cards" },
    { type: "cta", variant: "band", ground: "primary" },
  ],
  visit: [
    { type: "hero", variant: "typographic", align: "centre", pad: "compact" },
    { type: "times", variant: "cards", bind: { source: "serviceTimes" } },
    { type: "visit", variant: "steps", ground: "surface" },
    { type: "location", variant: "mapRight" },
    { type: "faq", variant: "list", ground: "surface" },
    { type: "contact", variant: "band", ground: "primary" },
  ],
  ministries: [
    { type: "hero", variant: "typographic", align: "centre", pad: "compact" },
    { type: "ministries", variant: "threeCards", bind: { source: "groups", limit: 12 } },
    { type: "cta", variant: "boxed", ground: "surface" },
  ],
  events: [
    { type: "hero", variant: "typographic", align: "centre", pad: "compact" },
    { type: "events", variant: "list", bind: { source: "events", limit: 12 } },
    { type: "cta", variant: "band", ground: "primary" },
  ],
  giving: [
    { type: "hero", variant: "typographic", align: "centre", pad: "compact" },
    { type: "give", variant: "cards", bind: { source: "funds" } },
    { type: "faq", variant: "twoColumn", ground: "surface" },
    { type: "contact", variant: "band", ground: "primary" },
  ],
  contact: [
    { type: "hero", variant: "typographic", align: "centre", pad: "compact" },
    { type: "contact", variant: "withMap" },
    { type: "form", variant: "split", ground: "surface" },
  ],
  sermons: [
    { type: "hero", variant: "typographic", align: "centre", pad: "compact" },
    { type: "video", variant: "wide" },
    { type: "cards", variant: "threeCards", ground: "surface" },
  ],
};

export const PAGE_STARTER_TITLE: Record<PageStarter, string> = {
  blank: "website.page.blank",
  about: "website.page.about",
  visit: "website.page.visit",
  ministries: "website.page.ministries",
  events: "website.page.events",
  giving: "website.page.giving",
  contact: "website.page.contact",
  sermons: "website.page.sermons",
};

const SLUGS: Record<PageStarter, string> = {
  blank: "page",
  about: "about",
  visit: "visit",
  ministries: "ministries",
  events: "whats-on",
  giving: "giving",
  contact: "contact",
  sermons: "sermons",
};

export function newPage(
  starter: PageStarter,
  church: StarterChurch,
): SiteDoc["pages"][number] {
  const title = say(PAGE_STARTER_TITLE[starter]);
  const sections = STARTER_SLOTS[starter].map((slot) => sectionFrom(slot, church));
  /* The page's own name goes in the hero it opens with, so a new page is not
     three sections all saying "A heading". */
  const first = sections[0];
  if (first && first.type === "hero") {
    first.content = { ...first.content, title, body: [] };
  }
  return {
    id: newId("page"),
    title,
    slug: SLUGS[starter],
    inNav: true,
    seo: {},
    sections,
  };
}

/** A whole starting website, for a church that has just chosen a design. */
export function docFromTemplate(
  key: TemplateKey,
  church: StarterChurch,
): SiteDoc {
  const template = TEMPLATES[key];
  const home = {
    id: "home",
    title: say("website.page.home"),
    slug: "",
    inNav: true,
    seo: {},
    sections: template.home.map((slot) => sectionFrom(slot, church)),
  };
  return {
    v: 1,
    template: key,
    theme: template.theme,
    header: { ...template.header, logo: null, action: null },
    footer: { ...template.footer, blurb: [], links: [] },
    social: {},
    pages: [home],
    homeId: "home",
    seo: {},
  };
}

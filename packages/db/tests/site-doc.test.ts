/**
 * HRT-377, R22.2. The guard a website document passes through.
 *
 * Pure, so no database. Every case here is something a browser could send,
 * either because a church typed it or because somebody meant to.
 */
import { describe, expect, it } from "vitest";
import { InvalidInputError } from "../src/errors";
import {
  cleanImage, cleanLink, cleanLinkTarget, cleanRich, cleanSiteDoc, cleanSocial,
  cleanTheme, mediaKeysIn, navPages, pageFor, RESERVED_SLUGS, SITE_DOC_VERSION,
} from "../src/repo/site-doc";
import { blankContent, cleanSectionContent, SITE_SECTIONS } from "../src/repo/site-sections";
import { cleanTextStyle, cleanTextStyles } from "../src/repo/site-doc";

const clean = (value: unknown) => cleanSiteDoc(value, cleanSectionContent);

const page = (over: Record<string, unknown> = {}) => ({
  id: "home", title: "Home", slug: "", inNav: true, seo: {}, sections: [], ...over,
});
const doc = (over: Record<string, unknown> = {}) => ({
  template: "gathering", homeId: "home", pages: [page()], ...over,
});

const KEY = "river-church/website_media/0123abcd-4567-89ab-cdef-0123456789ab.webp";

describe("text runs", () => {
  it("takes a plain string, which is what the old editor held", () => {
    expect(cleanRich("Welcome")).toEqual([{ t: "Welcome" }]);
    expect(cleanRich("")).toEqual([]);
  });

  it("keeps bold, italic and a checked link, and drops anything else", () => {
    expect(cleanRich([
      { t: "Come ", b: true, colour: "red" },
      { t: "and see", i: true, href: { kind: "url", url: "https://example.org/" } },
      { t: "!", b: "yes" },
    ])).toEqual([
      { t: "Come ", b: true },
      { t: "and see", i: true, href: { kind: "url", url: "https://example.org/" } },
      { t: "!" },
    ]);
  });

  it("refuses a run that is not text, and a wall of it", () => {
    expect(() => cleanRich([{ t: 7 }])).toThrow(InvalidInputError);
    expect(() => cleanRich([{ t: "x".repeat(6001) }])).toThrow(InvalidInputError);
  });
});

describe("link destinations", () => {
  it("names the church's own places without an address", () => {
    expect(cleanLinkTarget({ kind: "give" })).toEqual({ kind: "give" });
    expect(cleanLinkTarget({ kind: "events" })).toEqual({ kind: "events" });
  });

  it("insists on https for an address somebody typed", () => {
    expect(cleanLinkTarget({ kind: "url", url: "https://example.org/x" }))
      .toEqual({ kind: "url", url: "https://example.org/x" });
    expect(() => cleanLinkTarget({ kind: "url", url: "http://example.org" }))
      .toThrow(InvalidInputError);
    expect(() => cleanLinkTarget({ kind: "url", url: "javascript:alert(1)" }))
      .toThrow(InvalidInputError);
    expect(() => cleanLinkTarget({ kind: "url", url: "https://user:pass@example.org" }))
      .toThrow(InvalidInputError);
  });

  it("falls back to nowhere for a kind nobody knows", () => {
    expect(cleanLinkTarget({ kind: "exec" })).toEqual({ kind: "none" });
    expect(cleanLinkTarget("https://example.org")).toEqual({ kind: "none" });
  });

  it("drops a button with a label and nowhere to go, and the other way round", () => {
    expect(cleanLink({ label: "Give", to: { kind: "give" } }))
      .toEqual({ label: "Give", to: { kind: "give" }, tone: "primary" });
    expect(cleanLink({ label: "", to: { kind: "give" } })).toBeNull();
    expect(cleanLink({ label: "Give", to: { kind: "nowhere" } })).toBeNull();
  });
});

describe("pictures", () => {
  it("takes a stored object of ours", () => {
    expect(cleanImage({ key: KEY, alt: "The building" })?.key).toBe(KEY);
  });

  it("refuses a key shaped like somebody else's storage", () => {
    expect(() => cleanImage({ key: "river-church/person_photo/a.webp" }))
      .toThrow(InvalidInputError);
    expect(() => cleanImage({ key: "../../../etc/passwd" })).toThrow(InvalidInputError);
  });

  it("ignores an address when a stored object is held, so both cannot be set", () => {
    const image = cleanImage({ key: KEY, url: "https://example.org/a.jpg" });
    expect(image).toMatchObject({ key: KEY, url: null });
  });

  it("holds the middle of the picture inside the frame", () => {
    expect(cleanImage({ key: KEY, focus: { x: 4, y: -2 } })?.focus).toEqual({ x: 1, y: 0 });
  });
});

describe("social addresses", () => {
  it("insists the address belongs to the service it is filed under", () => {
    expect(cleanSocial({ instagram: "https://www.instagram.com/church" }).instagram)
      .toBe("https://www.instagram.com/church");
    expect(() => cleanSocial({ instagram: "https://evil.example.org/church" }))
      .toThrow(InvalidInputError);
  });
});

describe("the theme", () => {
  it("falls back to the first of everything it does not recognise", () => {
    const theme = cleanTheme({ palette: "neon", fonts: 7, corners: "soft" });
    expect(theme.palette).toBe("stone");
    expect(theme.fonts).toBe("editorial");
    expect(theme.corners).toBe("soft");
  });

  it("keeps a colour a church chose, and only as a hex value", () => {
    const theme = cleanTheme({ colors: { primary: "#1A4D2E", ink: "rebeccapurple" } });
    expect(theme.colors.primary).toBe("#1a4d2e");
    expect(theme.colors.ink).toBeUndefined();
  });
});

describe("sections", () => {
  it("has a layout for every kind, and the first is its default", () => {
    for (const [type, kind] of Object.entries(SITE_SECTIONS)) {
      expect(kind.variants.length, type).toBeGreaterThan(0);
      expect(cleanSectionContent(type, "nonsense", {}).variant).toBe(kind.variants[0]);
    }
  });

  it("builds empty content for every kind without throwing", () => {
    for (const type of Object.keys(SITE_SECTIONS)) {
      expect(() => blankContent(type)).not.toThrow();
    }
  });

  it("refuses a kind nobody knows rather than dropping the section", () => {
    expect(() => cleanSectionContent("iframe", "wide", {})).toThrow(InvalidInputError);
  });

  it("keeps a repeated row's fields and caps how many there are", () => {
    const content = cleanSectionContent("values", "threeCards", {
      title: "What we believe",
      items: [{ title: "Scripture", body: "We read it together." }],
    }).content;
    expect(content["items"]).toEqual([
      { title: "Scripture", body: [{ t: "We read it together." }], icon: "", image: null },
    ]);
    expect(() => cleanSectionContent("values", "list", {
      items: Array.from({ length: 13 }, () => ({ title: "x" })),
    })).toThrow(InvalidInputError);
  });
});

describe("the whole document", () => {
  it("settles a minimal one and writes the current version onto it", () => {
    const settled = clean(doc());
    expect(settled.v).toBe(SITE_DOC_VERSION);
    expect(settled.homeId).toBe("home");
    expect(settled.pages[0]!.slug).toBe("");
  });

  it("refuses a document with no pages", () => {
    expect(() => clean(doc({ pages: [] }))).toThrow(InvalidInputError);
    expect(() => clean({ pages: "home" })).toThrow(InvalidInputError);
  });

  it("refuses two pages at the same address, and two sections with one id", () => {
    expect(() => clean(doc({
      pages: [page(), page({ id: "about", slug: "about" }), page({ id: "two", slug: "about" })],
    }))).toThrow(InvalidInputError);
    expect(() => clean(doc({
      pages: [page({ sections: [
        { id: "a", type: "intro", variant: "lead", content: {} },
        { id: "a", type: "intro", variant: "lead", content: {} },
      ] })],
    }))).toThrow(InvalidInputError);
  });

  it("refuses an address the platform already answers", () => {
    for (const taken of ["give", "settings", "api", "sign-in"]) {
      expect(() => clean(doc({ pages: [page(), page({ id: "p", slug: taken })] })), taken)
        .toThrow(InvalidInputError);
    }
    expect(RESERVED_SLUGS.has("give")).toBe(true);
  });

  it("refuses an address that could climb out of the website", () => {
    for (const bad of ["../admin", "a/b", "Give", "-start"]) {
      expect(() => clean(doc({ pages: [page(), page({ id: "p", slug: bad })] })), bad)
        .toThrow(InvalidInputError);
    }
  });

  it("gives the home page the empty address and insists every other page has one", () => {
    const settled = clean(doc({
      homeId: "about",
      pages: [page({ id: "about", title: "About", slug: "about" }), page({ id: "home", slug: "welcome" })],
    }));
    expect(settled.homeId).toBe("about");
    expect(settled.pages.find((one) => one.id === "about")!.slug).toBe("");
    expect(() => clean(doc({
      pages: [page(), page({ id: "second", slug: "" })],
    }))).toThrow(InvalidInputError);
  });

  it("finds a page by its address, and lists what the navigation shows", () => {
    const settled = clean(doc({
      pages: [page(), page({ id: "visit", title: "Visit", slug: "visit" }),
        page({ id: "hidden", title: "Hidden", slug: "hidden", inNav: false })],
    }));
    expect(pageFor(settled, "")!.id).toBe("home");
    expect(pageFor(settled, "/visit/")!.id).toBe("visit");
    expect(pageFor(settled, "nothing")).toBeNull();
    expect(navPages(settled).map((one) => one.id)).toEqual(["home", "visit"]);
  });

  it("finds every picture the document points at, for the sweep", () => {
    const other = "river-church/website_media/ffffffff-4567-89ab-cdef-0123456789ab.png";
    const settled = clean(doc({
      header: { logo: { key: KEY, alt: "Mark" } },
      pages: [page({ sections: [{
        id: "hero", type: "hero", variant: "split",
        content: { image: { key: other, alt: "" } },
      }] })],
    }));
    expect(mediaKeysIn(settled).sort()).toEqual([KEY, other].sort());
  });
});

describe("how one piece of text is set", () => {
  it("keeps the answers it knows and drops the rest", () => {
    expect(cleanTextStyle({
      face: "display", size: "large", weight: "bold", align: "centre",
      tone: "primary", space: "loose",
    })).toEqual({
      face: "display", size: "large", weight: "bold", align: "centre",
      tone: "primary", space: "loose",
    });
    expect(cleanTextStyle({ size: "47px", tone: "#ff0000", face: "Comic Sans" }))
      .toBeUndefined();
  });

  it("is nothing at all when nothing was set, so the document stays small", () => {
    expect(cleanTextStyle({})).toBeUndefined();
    expect(cleanTextStyles({})).toBeUndefined();
    expect(cleanTextStyles({ title: {} })).toBeUndefined();
  });

  it("keys each one by the path the editor marks, and refuses a strange one", () => {
    expect(cleanTextStyles({
      "title": { align: "centre" },
      "items.0.title": { size: "small" },
      "../../etc": { size: "small" },
      "a b": { size: "small" },
    })).toEqual({
      "title": { align: "centre" },
      "items.0.title": { size: "small" },
    });
  });

  it("carries through a whole document", () => {
    const settled = clean(doc({
      pages: [page({ sections: [{
        id: "hero", type: "hero", variant: "split",
        content: { title: "Welcome" },
        text: { title: { align: "centre", size: "larger" } },
      }] })],
    }));
    expect(settled.pages[0]!.sections[0]!.text)
      .toEqual({ title: { align: "centre", size: "larger" } });
  });
});

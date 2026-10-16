/**
 * HRT-379, R22.2. The pieces every website section is built from.
 *
 * One set of components, rendered twice: on the server for the published page,
 * and inside the editor's canvas for the church that is building it. There is
 * no second implementation and no editing branch inside a section, because
 * editing is carried by data attributes the canvas reads and by nothing else.
 * A section writes `data-edit="title"`, and whether that becomes a cursor, a
 * ring or nothing at all is the canvas's business.
 *
 * That is the whole reason the canvas looks like the page. It is the page.
 */

import * as React from "react";
import Link from "next/link";
import type {
  Rich as RichText, Run, SiteImage, SiteLink, LinkTarget, SiteDoc, SectionStyle,
  TextStyle,
} from "@connectapp/db/rules";
import { localeFor } from "@connectapp/i18n";
import { withAlpha, paletteFor } from "./theme";

/* ------------------------------------------------------------ the church --- */

/**
 * What every section knows about the church it belongs to.
 *
 * Plain data, so it crosses from a server component into the editor's client
 * canvas without a serialisation problem. Anything that needs computing is a
 * pure function in this file rather than a closure in here.
 */
export interface SiteCtx {
  slug: string;
  name: string;
  country: string;
  timezone: string;
  logo: SiteImage | null;
  email: string | null;
  phone: string | null;
  address: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    region: string | null;
    postalCode: string | null;
  };
  takesGifts: boolean;
  /** The document being drawn, for resolving a link to another page. */
  doc: SiteDoc;
  /** What the church's own records say, where a section reads from them. */
  data: SiteDataForView;
  /** Drawn inside the editor, where an empty section still has to be visible. */
  editing?: boolean;
  /**
   * What the church has changed about particular pieces of text in the section
   * being drawn, keyed by the path the editor marks them with. The page sets
   * it per section, so a section component never has to thread it through.
   */
  text?: Record<string, TextStyle>;
  /**
   * Whether this section carries the page's one h1.
   *
   * A page has exactly one, and a church can put two welcomes on a page, so the
   * page decides rather than the section. Set on the first welcome it finds.
   */
  owns?: boolean;
}

/** The read-only shape of the bound data a section may draw. */
export interface SiteDataForView {
  services: { name: string; dayOfWeek: number; startsAt: string; campus: string | null }[];
  events: {
    id: string; slug: string; name: string; hue: string; coverKey: string | null;
    startsOn: string; startsAt: string | null; endsOn: string | null;
    location: string | null; city: string | null; takesRegistrations: boolean;
  }[];
  groups: {
    id: string; slug: string | null; name: string; description: string | null;
    typeName: string | null; typeHue: string | null; photoKey: string | null;
    dayOfWeek: number | null; startsAt: string | null; location: string | null;
    online: boolean; openToJoin: boolean;
  }[];
  funds: { id: string; name: string; description: string | null }[];
  forms: Record<string, { id: string; name: string; intro: string | null } | undefined>;
}

/* ------------------------------------------------------------- addresses --- */

/** Where a stored picture is fetched from. One address, editor and page alike. */
export function mediaUrl(image: SiteImage | null | undefined): string | null {
  if (!image) return null;
  if (image.key) return `/site-media/${image.key}`;
  return image.url ?? null;
}

export function keyUrl(key: string | null | undefined): string | null {
  return key ? `/site-media/${key}` : null;
}

const addressLine = (site: SiteCtx): string =>
  [site.address.line1, site.address.line2, site.address.city, site.address.region, site.address.postalCode]
    .filter(Boolean).join(", ");

/**
 * The address a destination resolves to, or nothing.
 *
 * Nothing means the control is not drawn, which is how a give button stays off
 * the page of a church that cannot take a gift and a telephone link stays off
 * one that has not given a number.
 */
export function hrefFor(site: SiteCtx, to: LinkTarget | undefined): string | null {
  if (!to) return null;
  switch (to.kind) {
    case "none": return null;
    case "url": return to.url;
    case "page": {
      const page = site.doc.pages.find((one) => one.id === to.pageId);
      if (!page) return null;
      return page.id === site.doc.homeId ? "/" : `/${page.slug}`;
    }
    case "anchor": return `#s-${to.sectionId}`;
    case "give": return site.takesGifts ? `/give/${site.slug}` : null;
    case "events": return `/e/${site.slug}`;
    case "groups": return `/g/${site.slug}`;
    case "form": return `/f/${site.slug}/${to.formSlug}`;
    case "join": return "/join";
    case "signIn": return "/sign-in";
    case "email": return site.email ? `mailto:${site.email}` : null;
    case "phone": return site.phone ? `tel:${site.phone.replace(/\s+/g, "")}` : null;
    case "map": {
      const line = addressLine(site);
      return line
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(line)}`
        : null;
    }
  }
}

const away = (href: string) => /^https?:/i.test(href);

/* ----------------------------------------------------------------- text --- */

/* ------------------------------------------------- one piece of text's own --- */

const FACE: Record<NonNullable<TextStyle["face"]>, string> = {
  display: "font-[family-name:var(--s-display)]",
  body: "font-[family-name:var(--s-body)]",
};

/**
 * A step either side of whatever size the design gives the slot.
 *
 * Relative rather than absolute, so a heading set larger is still a heading in
 * every design and at every width. A church cannot type a pixel value, which is
 * the whole point: that is how a site stops holding together.
 */
const SIZE: Record<NonNullable<TextStyle["size"]>, string> = {
  smaller: "text-[0.78em]",
  small: "text-[0.9em]",
  regular: "",
  large: "text-[1.15em]",
  larger: "text-[1.35em]",
};

const WEIGHT: Record<NonNullable<TextStyle["weight"]>, string> = {
  light: "font-light",
  regular: "font-normal",
  medium: "font-medium",
  bold: "font-bold",
};

const ALIGN: Record<NonNullable<TextStyle["align"]>, string> = {
  left: "text-left",
  centre: "text-center",
  right: "text-right",
};

const TONE: Record<NonNullable<TextStyle["tone"]>, string> = {
  ink: "text-[var(--s-ink)]",
  muted: "text-[var(--s-muted)]",
  primary: "text-[var(--s-primary)]",
  accent: "text-[var(--s-accent)]",
};

const SPACE: Record<NonNullable<TextStyle["space"]>, string> = {
  tight: "leading-[1.15]",
  regular: "",
  loose: "leading-[1.7]",
};

/** The classes one piece of text asks for, or nothing where it asks for none. */
export function textClasses(style: TextStyle | undefined): string {
  if (!style) return "";
  return [
    style.face ? FACE[style.face] : "",
    style.size ? SIZE[style.size] : "",
    style.weight ? WEIGHT[style.weight] : "",
    style.align ? ALIGN[style.align] : "",
    style.tone ? TONE[style.tone] : "",
    style.space ? SPACE[style.space] : "",
  ].filter(Boolean).join(" ");
}

/** Marks an element as the thing the canvas can edit, when it is editing. */
export const marks = (
  editing: boolean | undefined, at: string | undefined, kind: string,
): Record<string, string> =>
  editing && at ? { "data-edit": at, "data-edit-kind": kind } : {};

/** A run of text, as a span, an emphasis, a strong or a link. */
function RunView({ run, site }: { run: Run; site: SiteCtx }) {
  const inner = run.b && run.i
    ? <strong><em>{run.t}</em></strong>
    : run.b ? <strong>{run.t}</strong>
    : run.i ? <em>{run.t}</em>
    : run.t;
  const href = hrefFor(site, run.href);
  if (!href) return <>{inner}</>;
  const look =
    "underline decoration-[1.5px] underline-offset-[3px] transition-colors"
    + " hover:text-[var(--s-primary)]";
  /*
   * Inside the canvas the destination rides along on the element, because the
   * editor reads the words back out of the DOM after somebody has typed in
   * them. Without it a link to another page would come back as the address it
   * happened to resolve to, and a page renamed later would break it.
   */
  if (site.editing) {
    return <span className={look} data-to={JSON.stringify(run.href)}>{inner}</span>;
  }
  return (
    <a
      href={href}
      className={look}
      {...(away(href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {inner}
    </a>
  );
}

export function Rich({ value, site }: { value: RichText; site: SiteCtx }) {
  return (
    <>
      {value.map((run, index) => (
        <RunView key={index} run={run} site={site} />
      ))}
    </>
  );
}

export const richIsEmpty = (value: RichText | undefined): boolean =>
  !value || value.every((run) => !run.t.trim());

export const plainText = (value: RichText | undefined): string =>
  (value ?? []).map((run) => run.t).join("");

/**
 * A single line of the church's own words: a heading, a name, a label.
 *
 * Empty, it leaves the page, unless the editor is open, where it shows what it
 * is waiting for. A church cannot fix a heading it cannot see.
 */
export function T({
  value,
  as: Tag = "span",
  at,
  site,
  className = "",
  placeholder,
  id,
}: {
  value: string;
  as?: React.ElementType;
  at?: string;
  site: SiteCtx;
  className?: string;
  placeholder?: string;
  id?: string;
}) {
  const empty = !value.trim();
  if (empty && !site.editing) return null;
  const own = at ? textClasses(site.text?.[at]) : "";
  return (
    <Tag
      {...(id ? { id } : {})}
      className={
        `${className} ${own} ${empty ? "text-[var(--s-muted)] opacity-60" : ""}`.trim()
      }
      {...marks(site.editing, at, "line")}
    >
      {empty ? placeholder ?? "" : value}
    </Tag>
  );
}

/** A paragraph of the church's own words. */
export function P({
  value,
  at,
  site,
  className = "",
  placeholder,
  style,
}: {
  value: RichText;
  at?: string;
  site: SiteCtx;
  className?: string;
  placeholder?: string;
  style?: React.CSSProperties;
}) {
  const empty = richIsEmpty(value);
  if (empty && !site.editing) return null;
  const own = at ? textClasses(site.text?.[at]) : "";
  return (
    <p
      className={
        `m-0 whitespace-pre-line ${className} ${own} ${empty ? "opacity-60" : ""}`.trim()
      }
      style={style}
      {...marks(site.editing, at, "rich")}
    >
      {empty ? placeholder ?? "" : <Rich value={value} site={site} />}
    </p>
  );
}

/* --------------------------------------------------------------- picture --- */

export function Pic({
  value,
  at,
  site,
  className = "",
  ratio,
  sizes = "100vw",
  priority,
  alt,
  drawn,
}: {
  value: SiteImage | null;
  at?: string;
  site: SiteCtx;
  className?: string;
  /** A CSS aspect ratio, so the space is held before the picture arrives. */
  ratio?: string;
  sizes?: string;
  priority?: boolean;
  alt?: string;
  /**
   * Draws the theme's own artwork when there is no photograph, for a layout
   * built around a picture. Left off, an empty picture closes the space up.
   */
  drawn?: boolean;
}) {
  const url = mediaUrl(value);
  const position = value?.focus
    ? `${Math.round(value.focus.x * 100)}% ${Math.round(value.focus.y * 100)}%`
    : "50% 50%";
  const frame = `overflow-hidden bg-[var(--s-ink-soft)] ${className}`;
  const style = ratio ? { aspectRatio: ratio } : undefined;

  if (!url) {
    /* Nothing uploaded. On a page the space closes up, unless the layout is
       built around a picture, where the theme's own artwork stands in it. In
       the editor it is always a place to press, drawn in the site's own
       colours rather than as a grey box with a cross through it. */
    if (!site.editing) {
      return drawn
        ? <Drawn site={site} ratio={ratio} className={`${className} rounded-[var(--s-image-corner)]`} />
        : null;
    }
    return (
      <div
        className={`${frame} grid place-items-center border border-dashed border-[var(--s-line)]`}
        style={style}
        {...marks(site.editing, at, "image")}
      >
        <span className="px-4 text-center font-[family-name:var(--s-body)] text-sm text-[var(--s-muted)]">
          {alt ?? ""}
        </span>
      </div>
    );
  }

  return (
    <div className={frame} style={style} {...marks(site.editing, at, "image")}>
      {/* eslint-disable-next-line @next/next/no-img-element -- the church's own
          storage, served through /site-media with its own caching and resizing;
          next/image would proxy a signed redirect it cannot cache. */}
      <img
        src={url}
        alt={value?.alt ?? ""}
        sizes={sizes}
        loading={priority ? "eager" : "lazy"}
        {...(priority ? { fetchPriority: "high" as const } : {})}
        decoding="async"
        className="size-full"
        style={{
          objectFit: value?.fit === "contain" ? "contain" : "cover",
          objectPosition: position,
          /* The crop: how far in, around the middle the church chose. The
             frame clips, so the shape the design asked for is kept. */
          ...(value?.zoom && value.zoom > 1
            ? { transform: `scale(${value.zoom})`, transformOrigin: position }
            : {}),
        }}
      />
    </div>
  );
}


/**
 * What stands in for a photograph a church has not taken yet.
 *
 * Drawn in the theme's own colours rather than a stock photograph of somebody
 * else's building: a church's website should never show a picture of a place
 * that is not its place. It is deliberately abstract, so nobody mistakes it for
 * the church, and it carries the first letter of the church's name so the space
 * says whose it is.
 *
 * Used where a layout falls apart without something in the frame, which is the
 * hero and the bands that are built around a picture. Everywhere else an empty
 * picture simply closes up.
 */
export function Drawn({
  site,
  className = "",
  ratio,
}: {
  site: SiteCtx;
  className?: string;
  ratio?: string;
}) {
  const letter = site.name.trim().charAt(0).toUpperCase() || "C";
  return (
    <div
      aria-hidden
      className={`relative overflow-hidden bg-[var(--s-primary-soft)] ${className}`}
      style={ratio ? { aspectRatio: ratio } : undefined}
    >
      <span
        className="absolute -right-[18%] -top-[22%] block size-[78%] rounded-full"
        style={{ background: "var(--s-accent-soft)" }}
      />
      <span
        className="absolute -bottom-[26%] -left-[14%] block size-[64%] rounded-full"
        style={{ background: "var(--s-primary)", opacity: 0.14 }}
      />
      <span
        className="absolute inset-x-0 bottom-0 block h-[38%]"
        style={{
          background: "linear-gradient(to top, var(--s-accent-soft), transparent)",
        }}
      />
      <span
        className={
          "absolute inset-0 grid place-items-center font-[family-name:var(--s-display)]"
          + " text-[clamp(72px,16cqw,180px)] leading-none text-[var(--s-primary)] opacity-35"
        }
        style={{ containerType: "inline-size" }}
      >
        {letter}
      </span>
    </div>
  );
}

/* --------------------------------------------------------------- buttons --- */

export const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-[var(--s-button-corner)]"
  + " px-[1.35em] py-[0.78em] font-[family-name:var(--s-body)] text-[0.95rem]"
  + " font-semibold leading-none no-underline transition-[transform,background-color,color,border-color]"
  + " duration-150 focus-visible:outline focus-visible:outline-2"
  + " focus-visible:outline-offset-2 focus-visible:outline-[var(--s-primary)]"
  + " motion-safe:active:translate-y-px";

export const TONES: Record<NonNullable<SiteLink["tone"]>, string> = {
  primary:
    "bg-[var(--s-primary)] text-[var(--s-primary-ink)] border border-[var(--s-primary)]"
    + " hover:brightness-[1.08]",
  secondary:
    "border border-[var(--s-primary)] bg-transparent text-[var(--s-primary)]"
    + " hover:bg-[var(--s-primary-soft)]",
  quiet:
    "border border-transparent bg-transparent px-0 py-0 text-[var(--s-primary)]"
    + " underline decoration-[1.5px] underline-offset-[5px] hover:opacity-80",
};

/** One of the church's buttons. Nowhere to go means it is not drawn. */
export function Btn({
  value,
  at,
  site,
  tone,
  className = "",
}: {
  value: SiteLink | null;
  at?: string;
  site: SiteCtx;
  /** Overrides what the button itself says, where a layout needs it to. */
  tone?: NonNullable<SiteLink["tone"]>;
  className?: string;
}) {
  const href = value ? hrefFor(site, value.to) : null;
  if (!value || !href) {
    if (!site.editing || !at) return null;
    return (
      <span
        className={`${BUTTON_BASE} ${TONES.secondary} border-dashed opacity-60 ${className}`}
        {...marks(site.editing, at, "link")}
      >
        {value?.label || ""}
      </span>
    );
  }
  const look = `${BUTTON_BASE} ${TONES[tone ?? value.tone ?? "primary"]} ${className}`;
  const outward = away(href);
  if (site.editing) {
    /* Inside the canvas a button is a thing to select, so it is not a link. */
    return (
      <span className={look} {...marks(true, at, "link")}>{value.label}</span>
    );
  }
  return outward || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#") ? (
    <a
      href={href}
      className={look}
      {...(outward ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {value.label}
    </a>
  ) : (
    <Link href={href} className={look}>{value.label}</Link>
  );
}

/** The row a section's one or two actions sit in. */
export function Btns({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`flex flex-wrap items-center gap-3 ${className}`}>{children}</div>;
}

/* ----------------------------------------------------------- the section --- */

const GROUNDS: Record<NonNullable<SectionStyle["ground"]>, string> = {
  page: "bg-[var(--s-bg)] text-[var(--s-ink)]",
  surface: "bg-[var(--s-surface)] text-[var(--s-ink)]",
  primary: "bg-[var(--s-primary)] text-[var(--s-primary-ink)]",
  accent: "bg-[var(--s-accent)] text-[var(--s-primary-ink)]",
  ink: "bg-[var(--s-ink)] text-[var(--s-bg)]",
  image: "text-white",
};

const PADS: Record<NonNullable<SectionStyle["pad"]>, string> = {
  none: "py-0",
  compact: "py-[calc(var(--s-pad)*0.55)]",
  regular: "py-[var(--s-pad)]",
  generous: "py-[calc(var(--s-pad)*1.45)]",
};

/**
 * The band a section sits in: its ground, its air, and its own id.
 *
 * The id is what an in-page link lands on, which is why it is here rather than
 * left to each kind to remember.
 */
export function Band({
  id,
  style,
  site,
  children,
  className = "",
}: {
  id: string;
  style: SectionStyle | undefined;
  site: SiteCtx;
  children: React.ReactNode;
  className?: string;
}) {
  const ground = style?.ground ?? "page";
  const picture = ground === "image" ? mediaUrl(style?.background ?? null) : null;
  const palette = paletteFor(site.doc.theme);
  const hide = style?.hideOn === "phone"
    ? "hidden sm:block"
    : style?.hideOn === "desk" ? "sm:hidden" : "";
  return (
    <section
      id={`s-${id}`}
      className={`relative isolate ${GROUNDS[ground]} ${PADS[style?.pad ?? "regular"]} ${hide} ${className}`}
      {...(picture
        ? {
            style: {
              backgroundImage: `url(${picture})`,
              backgroundSize: "cover",
              backgroundPosition: style?.background?.focus
                ? `${Math.round(style.background.focus.x * 100)}% ${Math.round(style.background.focus.y * 100)}%`
                : "center",
            },
          }
        : {})}
    >
      {picture ? (
        <span
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{ background: withAlpha(palette.ink, (style?.overlay ?? 40) / 100) }}
        />
      ) : null}
      {children}
    </section>
  );
}

/** The reading column inside a band. */
export function Inner({
  children,
  className = "",
  wide,
}: {
  children: React.ReactNode;
  className?: string;
  /** Reaches the theme's full width rather than the reading measure. */
  wide?: boolean;
}) {
  return (
    <div
      className={
        "mx-auto w-full px-5 sm:px-8 "
        + (wide ? "max-w-[var(--s-width)] " : "max-w-[calc(var(--s-width)-120px)] ")
        + className
      }
    >
      {children}
    </div>
  );
}

/* --------------------------------------------------------------- lockups --- */

export const EYEBROW =
  "m-0 font-[family-name:var(--s-body)] text-[0.78rem] font-semibold uppercase"
  + " tracking-[0.18em] text-[var(--s-primary)]";

export const DISPLAY =
  "m-0 text-balance font-[family-name:var(--s-display)]"
  + " font-[number:var(--s-display-weight)] leading-[1.06]"
  + " tracking-[var(--s-display-tracking)]";

export const HEADING = `${DISPLAY} text-[length:var(--s-h2)]`;
export const SUBHEAD = `${DISPLAY} text-[length:var(--s-h3)] leading-[1.25]`;
export const BODY =
  "font-[family-name:var(--s-body)] text-[length:var(--s-text)] leading-[1.65]";

/** The eyebrow, heading and standfirst nearly every section opens with. */
export function Head({
  content,
  site,
  centred,
  className = "",
  as = "h2",
  max = "62ch",
  ph,
}: {
  content: Record<string, unknown>;
  site: SiteCtx;
  centred?: boolean;
  className?: string;
  as?: "h1" | "h2" | "h3";
  max?: string;
  /**
   * What an empty heading and standfirst say inside the editor.
   *
   * Without it an empty title renders as a zero-size element carrying
   * `data-edit`, which is a thing the canvas can select and a church cannot
   * see. Every kind passes its own `website.ph.<type>.*` pair.
   */
  ph?: { title?: string; body?: string };
}) {
  const eyebrow = typeof content["eyebrow"] === "string" ? content["eyebrow"] : "";
  const title = typeof content["title"] === "string" ? content["title"] : "";
  const body = Array.isArray(content["body"]) ? content["body"] as RichText : [];
  if (!eyebrow && !title && richIsEmpty(body) && !site.editing) return null;
  return (
    <div
      className={`flex flex-col gap-[var(--s-gap)] ${centred ? "items-center text-center" : ""} ${className}`}
    >
      <div className={`flex flex-col gap-3 ${centred ? "items-center" : ""}`}>
        <T value={eyebrow} as="p" at="eyebrow" site={site} className={EYEBROW} />
        <T
          value={title}
          as={as}
          at="title"
          site={site}
          placeholder={ph?.title}
          className={as === "h1" ? `${DISPLAY} text-[length:var(--s-hero)]` : HEADING}
        />
      </div>
      <P
        value={body}
        at="body"
        site={site}
        placeholder={ph?.body}
        className={`${BODY} text-[var(--s-muted)]`}
        style={{ maxWidth: max }}
      />
    </div>
  );
}

/** A card, in whatever edge treatment the theme asks for. */
export function Card({
  children,
  className = "",
  pad = true,
}: {
  children: React.ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return (
    <div
      className={
        `rounded-[var(--s-corner)] bg-[var(--s-surface)] [border:var(--s-card-border)]`
        + ` [box-shadow:var(--s-card-shadow)] ${pad ? "p-6 sm:p-7" : ""} ${className}`
      }
    >
      {children}
    </div>
  );
}

/** The grid a set of cards is laid out on. */
export function Grid({
  columns,
  children,
  className = "",
}: {
  columns: 2 | 3 | 4;
  children: React.ReactNode;
  className?: string;
}) {
  const at = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
  }[columns];
  return (
    <div className={`grid grid-cols-1 gap-[calc(var(--s-gap)*1.1)] ${at} ${className}`}>
      {children}
    </div>
  );
}

/**
 * Whether a section that reads from the church has nothing to say yet.
 *
 * On a published page it comes off altogether: a visitor met with "Service
 * times" and a blank space under it learns less than a visitor who never saw
 * the band. In the editor it stays, because the church is the one who has to
 * know the section is waiting on something.
 */
export const standsDown = (site: SiteCtx, bound: boolean, rows: number): boolean =>
  bound && rows === 0 && !site.editing;

/** What a section shows the church when it has nothing to show a visitor. */
export function NothingYet({ site, children }: { site: SiteCtx; children: React.ReactNode }) {
  if (!site.editing) return null;
  return (
    <div
      className={
        "rounded-[var(--s-corner)] border border-dashed border-[var(--s-line)]"
        + " p-6 text-center font-[family-name:var(--s-body)] text-sm text-[var(--s-muted)]"
      }
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------- the clock --- */

/**
 * R1.1, R24.6. Days, times and dates written the way the church's country
 * writes them, from the country on its record rather than the reader's browser.
 */
export const dayName = (day: number, country: string): string =>
  new Intl.DateTimeFormat(localeFor(country), { weekday: "long", timeZone: "UTC" })
    .format(new Date(Date.UTC(2024, 0, 7 + day)));

export const timeLabel = (time: string, country: string): string => {
  const [hour, minute] = time.split(":").map(Number);
  if (hour === undefined || minute === undefined) return time;
  return new Intl.DateTimeFormat(localeFor(country), {
    hour: "numeric", minute: "2-digit", timeZone: "UTC",
  }).format(new Date(Date.UTC(2024, 0, 1, hour, minute)));
};

/** A date held as YYYY-MM-DD, written out. */
export const dateLabel = (
  date: string, country: string, long = false,
): string => {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return new Intl.DateTimeFormat(localeFor(country), {
    weekday: long ? "long" : undefined,
    day: "numeric",
    month: long ? "long" : "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
};

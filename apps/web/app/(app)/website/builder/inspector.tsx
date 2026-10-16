"use client";

/**
 * HRT-380, R22.2. The right-hand column of the website editor.
 *
 * It draws the controls for whatever is selected on the canvas and nothing
 * else: the page itself when nothing is, a whole section, one field inside a
 * section, or the header and the footer. The shape of a section's content is
 * read out of `SITE_SECTIONS`, so a kind that gains a field gains its control
 * here without a line being written.
 *
 * Everything is written through `api.change`, which is the one place that
 * decides what an undo step is. A control somebody drags or types into passes a
 * merge key, so a run of keystrokes collapses into one step.
 */

import * as React from "react";
import {
  ArrowDown, ArrowUp, Image as ImageIcon, Plus, Trash2,
} from "lucide-react";
import { t, type MessageKey } from "@connectapp/i18n";
import {
  SITE_SECTIONS, imageOf, linkOf, richOf, rowsOf, textOf,
  type FieldShape, type LinkTarget, type Rich, type SectionStyle, type SiteField,
  type SiteImage, type SiteLink, type SitePage, type SiteSection,
} from "@connectapp/db/rules";
import {
  Button, Dialog, DialogClose, DialogContent, DialogFooter, Field, IconButton,
  Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Separator,
  Switch, Textarea,
} from "@connectapp/ui";
import { mediaUrl } from "@/components/church-site/kit";
import { kindOf } from "@/components/church-site/registry";
import type { BuilderApi, FormChoice } from "./api";
import {
  FOOTER, HEADER, addRow, atPath, moveRow, removeRow, sectionOf, setBinding,
  setField, setStyle, setVariant, withPath,
} from "./store";

/* -------------------------------------------------------------- the words --- */

const say = (key: string): string => t(key as MessageKey);

/** A label for a field, where the catalogue has one for it by name. */
const FIELD_WORDS: Record<string, string> = {
  title: "website.fieldName.title",
  body: "website.section.body",
  embed: "website.section.videoUrl",
  address: "church.address",
  directions: "website.fieldName.directions",
  when: "website.part.when",
  where: "website.part.where",
  alt: "website.field.alt",
  showAddress: "website.footer.showAddress",
  showContact: "website.footer.showContact",
  showSocial: "website.footer.showSocial",
  showMap: "website.field.showMap",
  height: "website.field.height",
};

/** What a choice field's options are called, where the words already exist. */
const CHOICE_WORDS: Record<string, string> = {
  small: "website.scale.compact",
  regular: "website.scale.regular",
  large: "website.scale.grand",
};

const wordsFor = (name: string): string =>
  FIELD_WORDS[name] ? say(FIELD_WORDS[name]) : t("website.field.content");

/* ------------------------------------------------------------- the pieces --- */

const RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
  + " focus-visible:outline-primary";

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-[length:var(--d-text-caption)] font-semibold uppercase tracking-wide text-fg-muted">
        {title}
      </h3>
      {children}
    </section>
  );
}

/** A heading, the controls under it, and a line between it and the next one. */
function Groups({ children }: { children: React.ReactNode }) {
  const parts = React.Children.toArray(children).filter(Boolean);
  return (
    <div className="flex flex-col gap-4 p-4">
      {parts.map((part, at) => (
        <React.Fragment key={at}>
          {at > 0 ? <Separator /> : null}
          {part}
        </React.Fragment>
      ))}
    </div>
  );
}

function Choice({
  label, value, options, onPick, searchable,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onPick: (value: string) => void;
  searchable?: boolean;
}) {
  return (
    <Field label={label}>
      <Select value={value} onValueChange={onPick}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent searchLabel={searchable ? t("common.search") : undefined}>
          {options.map((one) => (
            <SelectItem key={one.value} value={one.value}>{one.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

/**
 * A switch with its words beside it.
 *
 * The words are a span the switch points at rather than a `<label>`, because
 * what Radix draws is a button and a label element cannot name one.
 */
function Toggle({
  label, on, onSet,
}: {
  label: string;
  on: boolean;
  onSet: (on: boolean) => void;
}) {
  const id = React.useId();
  return (
    <div className="flex items-center justify-between gap-3">
      <span id={id} className="text-[length:var(--d-text-body)] text-fg">{label}</span>
      <Switch aria-labelledby={id} checked={on} onCheckedChange={onSet} />
    </div>
  );
}

function Slider({
  label, value, low, high, onSet,
}: {
  label: string;
  value: number;
  low: number;
  high: number;
  onSet: (value: number) => void;
}) {
  return (
    <Field label={label} action={<span className="text-fg-muted tabular-nums">{value}</span>}>
      <input
        type="range"
        min={low}
        max={high}
        value={value}
        onChange={(event) => onSet(Number(event.target.value))}
        className={`h-[var(--d-tap)] w-full cursor-pointer accent-primary ${RING}`}
      />
    </Field>
  );
}

function Num({
  label, value, low, high, onSet,
}: {
  label: string;
  value: number;
  low: number;
  high: number;
  onSet: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        inputMode="numeric"
        min={low}
        max={high}
        value={String(value)}
        onChange={(event) => {
          const given = Number(event.target.value);
          if (!Number.isFinite(given)) return;
          onSet(Math.min(high, Math.max(low, Math.round(given))));
        }}
      />
    </Field>
  );
}

function Disclosure({ children }: { children: React.ReactNode }) {
  return (
    <details className="group">
      <summary
        className={`flex min-h-[var(--d-tap)] cursor-pointer list-none items-center gap-2 rounded-[var(--d-radius-control)] text-[length:var(--d-text-body)] font-medium text-fg ${RING}`}
      >
        <span
          aria-hidden
          className="inline-block transition-transform group-open:rotate-90"
        >
          &rsaquo;
        </span>
        {t("website.field.more")}
      </summary>
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </details>
  );
}

/* ------------------------------------------------------------- a picture --- */

function Picture({
  image, onPick, onSet, onRemove,
}: {
  image: SiteImage | null;
  onPick: () => void;
  onSet: (image: SiteImage, merge?: string) => void;
  onRemove: () => void;
}) {
  const src = mediaUrl(image);
  if (!image) {
    return (
      <Button variant="secondary" full onClick={onPick}>
        <ImageIcon aria-hidden />
        {t("website.emptyImage")}
      </Button>
    );
  }
  const focus = image.focus ?? { x: 0.5, y: 0.5 };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="size-16 shrink-0 overflow-hidden rounded-[10px] border border-line bg-sunken">
          {src ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={src} alt={image.alt} className="size-full object-cover" />
          ) : null}
        </span>
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={onPick}>{t("website.field.replace")}</Button>
          <IconButton label={t("website.field.removeImage")} onClick={onRemove}>
            <Trash2 aria-hidden />
          </IconButton>
        </div>
      </div>

      <Field label={t("website.field.alt")}>
        <Input
          value={image.alt}
          onChange={(event) => onSet({ ...image, alt: event.target.value }, "image:alt")}
        />
      </Field>

      <Choice
        label={t("website.field.fit")}
        value={image.fit ?? "cover"}
        options={[
          { value: "cover", label: t("website.fit.cover") },
          { value: "contain", label: t("website.fit.contain") },
        ]}
        onPick={(value) => onSet({ ...image, fit: value === "contain" ? "contain" : "cover" })}
      />

      <Disclosure>
        <p className="text-[length:var(--d-text-label)] font-medium text-fg">
          {t("website.field.focus")}
        </p>
        <Slider
          label={t("website.field.focusAcross")}
          value={Math.round(focus.x * 100)}
          low={0}
          high={100}
          onSet={(given) => onSet(
            { ...image, focus: { x: given / 100, y: focus.y } }, "image:focus",
          )}
        />
        <Slider
          label={t("website.field.focusDown")}
          value={Math.round(focus.y * 100)}
          low={0}
          high={100}
          onSet={(given) => onSet(
            { ...image, focus: { x: focus.x, y: given / 100 } }, "image:focus",
          )}
        />
      </Disclosure>
    </div>
  );
}

/* ---------------------------------------------------------------- a link --- */

const valueOfTarget = (to: LinkTarget): string => {
  if (to.kind === "page") return `page:${to.pageId}`;
  if (to.kind === "form") return `form:${to.formSlug}`;
  if (to.kind === "anchor") return `anchor:${to.sectionId}`;
  return to.kind;
};

/** Whether an address a church typed is one the document will accept. */
function httpsOk(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

/**
 * Where a button goes, read back off the chosen option.
 *
 * A half-typed address resolves to nowhere rather than to itself, because the
 * document's guard refuses anything that is not https and a church typing one
 * character at a time would otherwise make the whole website unsaveable.
 */
function targetFrom(value: string, typed: string): LinkTarget {
  if (value.startsWith("page:")) return { kind: "page", pageId: value.slice(5) };
  if (value.startsWith("form:")) return { kind: "form", formSlug: value.slice(5) };
  if (value.startsWith("anchor:")) return { kind: "anchor", sectionId: value.slice(7) };
  if (value === "url") return httpsOk(typed) ? { kind: "url", url: typed } : { kind: "none" };
  switch (value) {
    case "give": return { kind: "give" };
    case "events": return { kind: "events" };
    case "groups": return { kind: "groups" };
    case "signIn": return { kind: "signIn" };
    case "email": return { kind: "email" };
    case "phone": return { kind: "phone" };
    case "map": return { kind: "map" };
    default: return { kind: "none" };
  }
}

function LinkControl({
  link, pages, forms, sections, takesGifts, onSet, merge,
}: {
  link: SiteLink | null;
  pages: SitePage[];
  forms: FormChoice[];
  sections: SiteSection[];
  takesGifts: boolean;
  onSet: (link: SiteLink, merge?: string) => void;
  merge: string;
}) {
  const to: LinkTarget = link?.to ?? { kind: "none" };
  const [mode, setMode] = React.useState(() => valueOfTarget(to));
  const [typed, setTyped] = React.useState(() => (to.kind === "url" ? to.url : ""));

  const put = (part: { label?: string; to?: LinkTarget; tone?: SiteLink["tone"] }, key?: string) =>
    onSet({
      label: part.label ?? link?.label ?? "",
      to: part.to ?? to,
      tone: part.tone ?? link?.tone ?? "primary",
    }, key);

  const options: { value: string; label: string }[] = [
    { value: "none", label: t("website.field.none") },
    ...pages.map((page) => ({ value: `page:${page.id}`, label: page.title })),
    { value: "url", label: t("website.field.external") },
    ...(takesGifts ? [{ value: "give", label: t("website.link.give") }] : []),
    { value: "events", label: t("website.link.events") },
    { value: "groups", label: t("website.link.groups") },
    ...forms.map((form) => ({ value: `form:${form.slug}`, label: form.name })),
    { value: "signIn", label: t("website.link.signIn") },
    { value: "email", label: t("website.link.email") },
    { value: "phone", label: t("website.link.phone") },
    { value: "map", label: t("website.link.map") },
    ...sections.map((one) => ({
      value: `anchor:${one.id}`,
      label: textOf(one.content["title"]) || kindOf(one.type)?.label || one.type,
    })),
  ];

  return (
    <div className="flex flex-col gap-3">
      <Field label={t("website.field.label")}>
        <Input
          value={link?.label ?? ""}
          onChange={(event) => put({ label: event.target.value }, `${merge}:label`)}
        />
      </Field>

      <Choice
        label={t("website.field.goesTo")}
        value={options.some((one) => one.value === mode) ? mode : "none"}
        options={options}
        searchable
        onPick={(value) => {
          setMode(value);
          put({ to: targetFrom(value, typed) });
        }}
      />

      {mode === "url" ? (
        <Field
          label={t("website.field.external")}
          error={typed && !httpsOk(typed) ? t("website.error.linkUrl") : undefined}
        >
          <Input
            value={typed}
            inputMode="url"
            onChange={(event) => {
              const given = event.target.value;
              setTyped(given);
              put({ to: targetFrom("url", given) }, `${merge}:url`);
            }}
          />
        </Field>
      ) : null}

      <Choice
        label={t("website.field.tone")}
        value={link?.tone ?? "primary"}
        options={[
          { value: "primary", label: t("website.tone.primary") },
          { value: "secondary", label: t("website.tone.secondary") },
          { value: "quiet", label: t("website.tone.quiet") },
        ]}
        onPick={(value) => put({ tone: value as SiteLink["tone"] })}
      />
    </div>
  );
}

/* ----------------------------------------------------------------- rows --- */

const plainOf = (value: Rich): string => value.map((run) => run.t).join("");

/** The words a row is known by in the list, from whatever it carries. */
function rowWords(shape: FieldShape, row: Record<string, unknown>): string {
  for (const [name, field] of Object.entries(shape)) {
    if (field.kind === "line") {
      const held = textOf(row[name]);
      if (held) return held;
    }
    if (field.kind === "rich") {
      const held = plainOf(richOf(row[name]));
      if (held) return held;
    }
  }
  return "";
}

function Rows({
  path, field, rows, onAdd, onMove, onRemove, onOpen,
}: {
  path: string;
  field: Extract<SiteField, { kind: "rows" }>;
  rows: Record<string, unknown>[];
  onAdd: () => void;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
  onOpen: (path: string) => void;
}) {
  const [removing, setRemoving] = React.useState<number | null>(null);
  const first = Object.keys(field.of)[0] ?? "";
  const asked = removing === null ? null : rows[removing];
  const askedWords = asked ? rowWords(field.of, asked) : "";

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1">
        {rows.map((row, at) => (
          <li
            key={at}
            className="flex items-center gap-1 rounded-[10px] border border-line bg-surface px-1"
          >
            <button
              type="button"
              onClick={() => onOpen(`${path}.${at}.${first}`)}
              className={`min-w-0 flex-1 cursor-pointer truncate px-1 py-2 text-left text-[length:var(--d-text-body)] text-fg ${RING}`}
            >
              {rowWords(field.of, row) || t("website.field.removeRowPlain")}
            </button>
            <IconButton
              label={t("website.field.moveRowUp")}
              disabled={at === 0}
              onClick={() => onMove(at, at - 1)}
            >
              <ArrowUp aria-hidden />
            </IconButton>
            <IconButton
              label={t("website.field.moveRowDown")}
              disabled={at === rows.length - 1}
              onClick={() => onMove(at, at + 1)}
            >
              <ArrowDown aria-hidden />
            </IconButton>
            <IconButton
              label={t("website.field.removeRow")}
              onClick={() => setRemoving(at)}
            >
              <Trash2 aria-hidden />
            </IconButton>
          </li>
        ))}
      </ul>

      <Button
        variant="secondary"
        full
        disabled={rows.length >= field.max}
        onClick={onAdd}
      >
        <Plus aria-hidden />
        {t("website.field.addRow")}
      </Button>

      <Dialog open={removing !== null} onOpenChange={(open) => { if (!open) setRemoving(null); }}>
        <DialogContent
          alert
          title={askedWords
            ? t("website.field.removeRowAsk", { name: askedWords })
            : t("website.field.removeRowPlain")}
        >
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">{t("action.cancel")}</Button>
            </DialogClose>
            <Button
              variant="danger"
              onClick={() => {
                if (removing !== null) onRemove(removing);
                setRemoving(null);
              }}
            >
              {t("website.field.removeRow")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** An empty row of a kind's shape, so a new one draws its own controls. */
function blankRow(shape: FieldShape): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, field] of Object.entries(shape)) {
    switch (field.kind) {
      case "line": out[name] = ""; break;
      case "rich": out[name] = []; break;
      case "flag": out[name] = false; break;
      case "choice": out[name] = field.of[0]; break;
      case "count": out[name] = field.low; break;
      case "rows": out[name] = []; break;
      case "links": out[name] = []; break;
      case "images": out[name] = []; break;
      default: out[name] = null;
    }
  }
  return out;
}

/* ------------------------------------------------------- walking the shape --- */

/** The description of the field a path names, or nothing where it names a row. */
function shapeAt(shape: FieldShape, path: string): SiteField | undefined {
  const steps = path.split(".");
  let here: SiteField | undefined = shape[steps[0] ?? ""];
  let at = 1;
  while (here && at < steps.length) {
    if (here.kind === "images") {
      here = { kind: "image" };
      at += 1;
      continue;
    }
    if (here.kind !== "rows") return undefined;
    const name = steps[at + 1];
    if (name === undefined) return undefined;
    here = here.of[name];
    at += 2;
  }
  return here;
}

/* ------------------------------------------------------------ the page --- */

function PageControls({ api }: { api: BuilderApi }) {
  const at = api.doc.pages.findIndex((one) => one.id === api.pageId);
  const page = api.page;
  const put = (path: string, value: unknown, merge?: string) =>
    api.change(withPath(api.doc, `pages.${at}.${path}`, value), merge);

  return (
    <Groups>
      <Group title={t("website.inspector.page")}>
        <Field label={t("website.pageName")}>
          <Input
            value={page.title}
            onChange={(event) => put("title", event.target.value, `page:${page.id}:title`)}
          />
        </Field>
        <Toggle
          label={t("website.inNav")}
          on={page.inNav}
          onSet={(on) => put("inNav", on)}
        />
      </Group>

      <Group title={t("website.settings.search")}>
        <Field label={t("website.field.seoTitle")}>
          <Input
            value={page.seo.title ?? ""}
            onChange={(event) => put(
              "seo.title", event.target.value, `page:${page.id}:seoTitle`,
            )}
          />
        </Field>
        <Field label={t("website.settings.description")}>
          <Textarea
            rows={3}
            value={page.seo.description ?? ""}
            onChange={(event) => put(
              "seo.description", event.target.value, `page:${page.id}:seoBody`,
            )}
          />
        </Field>
        <Toggle
          label={t("website.field.noIndexPage")}
          on={page.seo.noIndex === true}
          onSet={(on) => put("seo.noIndex", on ? true : undefined)}
        />
      </Group>

      <p className="text-[length:var(--d-text-body)] text-fg-muted">
        {t("website.inspector.nothing")}
      </p>
    </Groups>
  );
}

/* --------------------------------------------------- the header and footer --- */

function HeaderControls({ api }: { api: BuilderApi }) {
  const header = api.doc.header;
  const put = (path: string, value: unknown, merge?: string) =>
    api.change(withPath(api.doc, `header.${path}`, value), merge);

  return (
    <Groups>
      <Group title={t("website.design.header")}>
        <Choice
          label={t("website.field.layout")}
          value={header.style}
          options={["logoLeft", "centred", "minimal", "stacked"].map((key) => ({
            value: key,
            label: say(`website.header.${key}`),
          }))}
          onPick={(value) => put("style", value)}
        />
        <Toggle
          label={t("website.header.transparent")}
          on={header.transparent}
          onSet={(on) => put("transparent", on)}
        />
        <Toggle
          label={t("website.header.sticky")}
          on={header.sticky}
          onSet={(on) => put("sticky", on)}
        />
        <Toggle
          label={t("website.header.showName")}
          on={header.showName}
          onSet={(on) => put("showName", on)}
        />
      </Group>

      <Group title={t("website.header.logo")}>
        <Picture
          image={header.logo}
          onPick={() => api.openMedia({ sectionId: HEADER, path: "logo" })}
          onSet={(image, merge) => put("logo", image, merge)}
          onRemove={() => put("logo", null)}
        />
      </Group>

      <Group title={t("website.header.action")}>
        <LinkControl
          link={header.action}
          pages={api.doc.pages}
          forms={api.forms}
          sections={api.page.sections}
          takesGifts={api.church.takesGifts}
          merge="header:action"
          onSet={(link, merge) => put("action", link, merge)}
        />
      </Group>
    </Groups>
  );
}

function FooterControls({ api }: { api: BuilderApi }) {
  const footer = api.doc.footer;
  const [removing, setRemoving] = React.useState<number | null>(null);
  const put = (path: string, value: unknown, merge?: string) =>
    api.change(withPath(api.doc, `footer.${path}`, value), merge);

  const asked = removing === null ? null : footer.links[removing];

  return (
    <Groups>
      <Group title={t("website.design.footer")}>
        <Choice
          label={t("website.field.layout")}
          value={footer.style}
          options={["columns", "simple", "band"].map((key) => ({
            value: key,
            label: say(`website.footer.${key}`),
          }))}
          onPick={(value) => put("style", value)}
        />
        <Toggle
          label={t("website.footer.showAddress")}
          on={footer.showAddress}
          onSet={(on) => put("showAddress", on)}
        />
        <Toggle
          label={t("website.footer.showContact")}
          on={footer.showContact}
          onSet={(on) => put("showContact", on)}
        />
        <Toggle
          label={t("website.footer.showTimes")}
          on={footer.showTimes}
          onSet={(on) => put("showTimes", on)}
        />
        <Toggle
          label={t("website.footer.showSocial")}
          on={footer.showSocial}
          onSet={(on) => put("showSocial", on)}
        />
      </Group>

      <Group title={t("website.footer.blurb")}>
        <Field label={t("website.field.content")}>
          <Textarea
            rows={3}
            value={plainOf(footer.blurb)}
            onChange={(event) => put(
              "blurb",
              event.target.value ? [{ t: event.target.value }] : [],
              "footer:blurb",
            )}
          />
        </Field>
      </Group>

      <Group title={t("website.footer.links")}>
        {footer.links.map((link, at) => (
          <div key={at} className="flex flex-col gap-2 rounded-[12px] border border-line p-3">
            <div className="flex justify-end">
              <IconButton
                label={t("website.field.removeRow")}
                onClick={() => setRemoving(at)}
              >
                <Trash2 aria-hidden />
              </IconButton>
            </div>
            <LinkControl
              link={link}
              pages={api.doc.pages}
              forms={api.forms}
              sections={api.page.sections}
              takesGifts={api.church.takesGifts}
              merge={`footer:link:${at}`}
              onSet={(next, merge) => put(`links.${at}`, next, merge)}
            />
          </div>
        ))}
        <Button
          variant="secondary"
          full
          disabled={footer.links.length >= 12}
          onClick={() => put("links", [
            ...footer.links,
            { label: "", to: { kind: "none" }, tone: "primary" } satisfies SiteLink,
          ])}
        >
          <Plus aria-hidden />
          {t("website.field.addRow")}
        </Button>

        <Dialog
          open={removing !== null}
          onOpenChange={(open) => { if (!open) setRemoving(null); }}
        >
          <DialogContent
            alert
            title={asked?.label
              ? t("website.field.removeRowAsk", { name: asked.label })
              : t("website.field.removeRowPlain")}
          >
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary">{t("action.cancel")}</Button>
              </DialogClose>
              <Button
                variant="danger"
                onClick={() => {
                  if (removing !== null) {
                    put("links", footer.links.filter((_, one) => one !== removing));
                  }
                  setRemoving(null);
                }}
              >
                {t("website.field.removeRow")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Group>
    </Groups>
  );
}

/* ------------------------------------------------------------ one section --- */

function Variants({
  section, onPick,
}: {
  section: SiteSection;
  onPick: (variant: string) => void;
}) {
  const kind = kindOf(section.type);
  const Icon = kind?.icon;
  return (
    <div className="grid grid-cols-2 gap-2">
      {(kind?.variants ?? []).map((variant) => {
        const on = variant.key === section.variant;
        return (
          <button
            key={variant.key}
            type="button"
            aria-pressed={on}
            onClick={() => onPick(variant.key)}
            className={`flex cursor-pointer flex-col items-start gap-2 rounded-[10px] border bg-surface p-2 text-left transition-colors hover:bg-sunken ${RING} ${
              on ? "border-primary text-primary" : "border-line text-fg"
            }`}
          >
            <span
              aria-hidden
              className={`flex h-10 w-full items-center justify-center rounded-[6px] ${
                on ? "bg-primary-soft" : "bg-sunken"
              }`}
            >
              {Icon ? <Icon className="size-4" aria-hidden /> : null}
            </span>
            <span className="text-[length:var(--d-text-caption)] font-medium">
              {variant.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Source({
  api, section,
}: {
  api: BuilderApi;
  section: SiteSection;
}) {
  const binds = SITE_SECTIONS[section.type]?.binds ?? [];
  const live = binds.find((one) => one !== "manual");
  if (!live) return null;

  const source = section.bind?.source ?? binds[0] ?? "manual";
  const bind = (next: NonNullable<SiteSection["bind"]>) =>
    api.change(setBinding(api.doc, api.pageId, section.id, next));

  const liveBind = (): NonNullable<SiteSection["bind"]> => {
    switch (live) {
      case "events": return { source: "events", limit: 3 };
      case "groups": return { source: "groups", limit: 6 };
      case "funds": return { source: "funds" };
      case "form": return { source: "form", formSlug: api.forms[0]?.slug ?? "" };
      default: return { source: "serviceTimes" };
    }
  };

  const held = section.bind;
  const limit = held && (held.source === "events" || held.source === "groups")
    ? held.limit
    : 3;

  return (
    <Group title={t("website.field.source")}>
      {binds.includes("manual") ? (
        <Choice
          label={t("website.field.source")}
          value={source === "manual" ? "manual" : "live"}
          options={[
            { value: "live", label: t("website.field.source.live") },
            { value: "manual", label: t("website.field.source.manual") },
          ]}
          onPick={(value) => bind(value === "manual" ? { source: "manual" } : liveBind())}
        />
      ) : null}

      {source === "events" || source === "groups" ? (
        <Num
          label={t("website.field.howMany")}
          value={limit}
          low={1}
          high={24}
          onSet={(value) => bind(
            source === "events"
              ? { source: "events", limit: value }
              : { source: "groups", limit: value },
          )}
        />
      ) : null}

      {live === "form" ? (
        <Choice
          label={t("website.field.whichForm")}
          value={held?.source === "form" ? held.formSlug : (api.forms[0]?.slug ?? "")}
          options={api.forms.map((form) => ({ value: form.slug, label: form.name }))}
          searchable
          onPick={(value) => bind({ source: "form", formSlug: value })}
        />
      ) : null}
    </Group>
  );
}

function SectionControls({
  api, section,
}: {
  api: BuilderApi;
  section: SiteSection;
}) {
  const shape = SITE_SECTIONS[section.type]?.fields ?? {};
  const style: SectionStyle = section.style ?? {};
  const ground = style.ground ?? "page";
  /* Whether this kind can read from the church at all. Worked out here rather
     than inside Source, so a kind that cannot takes no separator either. */
  const bindable = (SITE_SECTIONS[section.type]?.binds ?? []).some(
    (one) => one !== "manual",
  );

  const styled = (next: SectionStyle, merge?: string) =>
    api.change(setStyle(api.doc, api.pageId, section.id, next), merge);
  const put = (path: string, value: unknown, merge?: string) =>
    api.change(setField(api.doc, api.pageId, section.id, path, value), merge);

  const rowsEntry = Object.entries(shape).find(
    (entry): entry is [string, Extract<SiteField, { kind: "rows" }>] =>
      entry[1].kind === "rows",
  );
  const links = Object.entries(shape).filter(([, field]) => field.kind === "link");
  const switches = Object.entries(shape).filter(
    ([, field]) => field.kind === "flag" || field.kind === "choice",
  );

  return (
    <Groups>
      <Group title={t("website.field.layout")}>
        <Variants
          section={section}
          onPick={(variant) => api.change(
            setVariant(api.doc, api.pageId, section.id, variant),
          )}
        />
      </Group>

      {bindable ? <Source api={api} section={section} /> : null}

      <Group title={t("website.field.background")}>
        <Choice
          label={t("website.field.ground")}
          value={ground}
          options={["page", "surface", "primary", "accent", "ink", "image"].map((key) => ({
            value: key,
            label: say(`website.ground.${key}`),
          }))}
          onPick={(value) => styled({ ...style, ground: value as SectionStyle["ground"] })}
        />
        {ground === "image" ? (
          <>
            <Picture
              image={style.background ?? null}
              onPick={() => api.openMedia({
                sectionId: section.id,
                path: "style.background",
              })}
              onSet={(image, merge) => styled({ ...style, background: image }, merge)}
              onRemove={() => styled({ ...style, background: null })}
            />
            <Slider
              label={t("website.field.overlay")}
              value={style.overlay ?? 40}
              low={0}
              high={90}
              onSet={(value) => styled({ ...style, overlay: value }, `style:${section.id}:overlay`)}
            />
          </>
        ) : null}
      </Group>

      <Group title={t("website.field.pad")}>
        <Choice
          label={t("website.field.pad")}
          value={style.pad ?? "regular"}
          options={["none", "compact", "regular", "generous"].map((key) => ({
            value: key,
            label: say(`website.pad.${key}`),
          }))}
          onPick={(value) => styled({ ...style, pad: value as SectionStyle["pad"] })}
        />
        <Choice
          label={t("website.field.align")}
          value={style.align ?? "left"}
          options={[
            { value: "left", label: t("website.align.left") },
            { value: "centre", label: t("website.align.centre") },
          ]}
          onPick={(value) => styled({ ...style, align: value as SectionStyle["align"] })}
        />
        <Disclosure>
          <Choice
            label={t("website.field.hideOn")}
            value={style.hideOn ?? "none"}
            options={["none", "phone", "desk"].map((key) => ({
              value: key,
              label: say(`website.hideOn.${key}`),
            }))}
            onPick={(value) => styled({
              ...style,
              hideOn: value === "none" ? undefined : (value as SectionStyle["hideOn"]),
            })}
          />
        </Disclosure>
      </Group>

      {rowsEntry ? (
        <Group title={t("website.field.rows")}>
          <Rows
            path={rowsEntry[0]}
            field={rowsEntry[1]}
            rows={rowsOf(atPath(section.content, rowsEntry[0]))}
            onAdd={() => api.change(addRow(
              api.doc, api.pageId, section.id, rowsEntry[0], blankRow(rowsEntry[1].of),
            ))}
            onMove={(from, to) => api.change(moveRow(
              api.doc, api.pageId, section.id, rowsEntry[0], from, to,
            ))}
            onRemove={(index) => api.change(removeRow(
              api.doc, api.pageId, section.id, rowsEntry[0], index,
            ))}
            onOpen={(path) => api.select({ sectionId: section.id, path })}
          />
        </Group>
      ) : null}

      {switches.length ? (
        <Group title={t("website.field.content")}>
          {switches.map(([name, field]) => (field.kind === "flag" ? (
            <Toggle
              key={name}
              label={wordsFor(name)}
              on={atPath(section.content, name) === true}
              onSet={(on) => put(name, on)}
            />
          ) : (
            <Choice
              key={name}
              label={wordsFor(name)}
              value={textOf(atPath(section.content, name))
                || (field.kind === "choice" ? field.of[0] ?? "" : "")}
              options={(field.kind === "choice" ? field.of : []).map((one) => ({
                value: one,
                label: CHOICE_WORDS[one] ? say(CHOICE_WORDS[one]) : one,
              }))}
              onPick={(value) => put(name, value)}
            />
          )))}
        </Group>
      ) : null}

      {links.map(([name], at) => (
        <Group
          key={name}
          title={at === 0 ? t("website.field.primaryButton") : t("website.field.secondaryButton")}
        >
          <LinkControl
            link={linkOf(atPath(section.content, name))}
            pages={api.doc.pages}
            forms={api.forms}
            sections={api.page.sections}
            takesGifts={api.church.takesGifts}
            merge={`link:${section.id}:${name}`}
            onSet={(link, merge) => put(name, link, merge)}
          />
        </Group>
      ))}
    </Groups>
  );
}

/* -------------------------------------------------------------- one field --- */

function FieldControls({
  api, section, path,
}: {
  api: BuilderApi;
  section: SiteSection;
  path: string;
}) {
  const shape = SITE_SECTIONS[section.type]?.fields ?? {};
  const field = shapeAt(shape, path);
  const held = atPath(section.content, path);
  const name = path.split(".").pop() ?? path;
  const merge = `field:${section.id}:${path}`;
  const put = (value: unknown, key?: string) =>
    api.change(setField(api.doc, api.pageId, section.id, path, value), key);

  if (!field) return <SectionControls api={api} section={section} />;

  switch (field.kind) {
    case "line":
      return (
        <Groups>
          <Group title={t("website.field.content")}>
            <Field label={wordsFor(name)}>
              <Input
                value={textOf(held)}
                maxLength={field.max ?? 160}
                onChange={(event) => put(event.target.value, merge)}
              />
            </Field>
          </Group>
        </Groups>
      );

    case "rich": {
      const runs = richOf(held);
      const plain = plainOf(runs);
      return (
        <Groups>
          <Group title={t("website.field.content")}>
            <Field label={wordsFor(name)}>
              <Textarea
                rows={5}
                value={plain}
                onChange={(event) => {
                  const given = event.target.value;
                  /* Replacing the runs loses bold and italic, so it happens
                     only where the words themselves have changed. */
                  if (given === plain) return;
                  put(given ? [{ t: given }] : [], merge);
                }}
              />
            </Field>
          </Group>
        </Groups>
      );
    }

    case "image":
      return (
        <Groups>
          <Group title={t("website.panel.media")}>
            <Picture
              image={imageOf(held)}
              onPick={() => api.openMedia({ sectionId: section.id, path })}
              onSet={(image, key) => put(image, key ? `${merge}:${key}` : undefined)}
              onRemove={() => put(null)}
            />
          </Group>
        </Groups>
      );

    case "link":
      return (
        <Groups>
          <Group title={t("website.field.primaryButton")}>
            <LinkControl
              link={linkOf(held)}
              pages={api.doc.pages}
              forms={api.forms}
              sections={api.page.sections}
              takesGifts={api.church.takesGifts}
              merge={merge}
              onSet={(link, key) => put(link, key)}
            />
          </Group>
        </Groups>
      );

    case "flag":
      return (
        <Groups>
          <Group title={t("website.field.content")}>
            <Toggle label={wordsFor(name)} on={held === true} onSet={(on) => put(on)} />
          </Group>
        </Groups>
      );

    case "choice":
      return (
        <Groups>
          <Group title={t("website.field.content")}>
            <Choice
              label={wordsFor(name)}
              value={textOf(held) || field.of[0] || ""}
              options={field.of.map((one) => ({
                value: one,
                label: CHOICE_WORDS[one] ? say(CHOICE_WORDS[one]) : one,
              }))}
              onPick={(value) => put(value)}
            />
          </Group>
        </Groups>
      );

    case "count":
      return (
        <Groups>
          <Group title={t("website.field.content")}>
            <Num
              label={wordsFor(name)}
              value={typeof held === "number" ? held : field.low}
              low={field.low}
              high={field.high}
              onSet={(value) => put(value, merge)}
            />
          </Group>
        </Groups>
      );

    default:
      return <SectionControls api={api} section={section} />;
  }
}

/* ------------------------------------------------------------- the column --- */

export function Inspector({ api }: { api: BuilderApi }) {
  const selected = api.selected;

  if (!selected) return <PageControls api={api} />;
  if (selected.sectionId === HEADER) return <HeaderControls api={api} />;
  if (selected.sectionId === FOOTER) return <FooterControls api={api} />;

  const section = sectionOf(api.doc, api.pageId, selected.sectionId);
  if (!section) return <PageControls api={api} />;

  if (selected.path) {
    return <FieldControls api={api} section={section} path={selected.path} />;
  }
  return <SectionControls api={api} section={section} />;
}

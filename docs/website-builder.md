# The website builder

How a church's own website is held, edited, published and served. Read this
before changing anything under `apps/web/components/church-site/`,
`apps/web/app/(app)/website/` or `packages/db/src/repo/site-*.ts`.

The board rows are HRT-338 (the umbrella) and HRT-377 to HRT-383.

## One renderer

The thing that keeps this honest: the editor's canvas and the published page are
the same components. There is no preview implementation and no editor
implementation.

```
packages/db/src/repo/site-doc.ts        the shape of a website, and its guard
packages/db/src/repo/site-sections.ts   what kinds of section exist, and their fields
packages/db/src/repo/site-palettes.ts   the eight grounds, and the contrast helper
apps/web/components/church-site/kit.tsx the primitives every section is built from
apps/web/components/church-site/sections/   22 kinds, about 70 layouts
apps/web/components/church-site/registry.tsx  kind -> component
apps/web/components/church-site/page-view.tsx one page, header to footer
```

A section is a pure presentational component. No `"use client"`, no hooks, no
handlers, no branch on whether it is being edited. It writes `data-edit="title"`
through the kit's `T`, `P`, `Pic` and `Btn`, and the editor's canvas reads those
attributes by delegation. That is the whole editing mechanism.

Adding a kind of section means: a block in `SITE_SECTIONS` describing its fields
and its layouts, a component in `sections/`, a line in `SECTION_VIEWS`, its
starting words in `starter.ts`, and `website.kind.*` plus `website.variant.*` in
the catalogue. Nothing else, and in particular no change to the editor.

## The document

One per church, held twice: `church_sites.draft` is what the editor works on and
`church_sites.live` is what the public page is rendered from. Publishing copies
one over the other and writes a row to `church_site_revisions`.

Nothing in a document holds markup. Text is plain text or a list of runs
carrying bold, italic and a link. A destination is named (`{kind: "give"}`,
`{kind: "page", pageId}`) and resolved at render time, so the only free-form
address a church can write is checked to be https with no credentials. A picture
is either a stored object of ours, matched against a strict key pattern, or an
https address. There is no path from a document to `innerHTML`.

`cleanSiteDoc` is the only way in. It refuses a kind nobody knows rather than
dropping the section, because a church that publishes a page with a hole in it
would never be told.

### Concurrency

A save carries the `draft_version` the screen was holding, checked in the same
statement that writes. The second of two administrators is told rather than
silently losing an afternoon.

## What the page reads from the church

`site-data.ts` resolves every binding through the readers the platform already
uses for its own public pages: `siteServiceTimes`, `publicEvents`,
`publicGroups`, `publicForm`, `givingPage`. Each carries its own gate (listed and
published, still to come, open, approved, not a demo), and that set of readers
is the allowlist. Nothing reaches a published page another way, and a bound row
is not editable on the website: the church changes it where it lives.

A section that is bound and has nothing to show comes off a published page
altogether and stays in the editor, where the church is the one who needs to
know.

## Serving it

- `apps/web/app/page.tsx` serves the home page on a church's own host.
- `apps/web/app/[sitePage]/page.tsx` serves every other page. A static segment
  always beats a dynamic one, so the product's own addresses are untouched, and
  `RESERVED_SLUGS` stops a church naming a page after one of them.
- `apps/web/app/(bare)/website/preview/[[...page]]` serves the draft, behind the
  same sign-in as the editor. It is also the editor's phone and tablet views,
  held in a frame at that width, because a layout answers to the window rather
  than to a box inside it.
- `apps/web/app/site-media/[...key]/route.ts` is the stable address for a
  picture. It redirects to a freshly signed URL and says how long the answer
  holds, which is what lets the HTML be cached at all. Before this, media was
  signed into the markup on every render.

### Who may fetch a picture

Enforced twice. In the route, and by the storage policy
`connectapp.website_media_is_public`, which asks whether the church's **live**
document points at that exact object, at any depth. A picture on the draft is
refused to everybody but the church's own staff. A church's mark is public by
nature and has its own policy.

### Caching

`readPublicSite` holds the document under the tag `site:<slug>`, dropped the
moment the church publishes, unpublishes or restores. `readSiteData` holds the
bound data for five minutes. Measured on a build: 50 to 56ms to first byte for a
home page of 47KB.

## The editor

`apps/web/app/(app)/website/builder/`:

```
store.ts      one reducer over one document, with history either side
api.ts        what every panel is handed; `change(doc, merge?)` is the only write
canvas.tsx    the page, with the editor's chrome over it
inspector.tsx whatever is selected, and only that
panels.tsx    pages, design, photos, settings
library.tsx   the section library, every thumbnail a real section
gallery.tsx   the six starting designs, every preview a real page
workspace.tsx the whole screen: autosave, undo, publishing
rich.ts       reading words back out of a contentEditable
```

Undo coalesces a run of keystrokes in one field into one step through the
`merge` key, and treats everything else as its own. The draft saves itself 1.2
seconds after a change settles, and again when the tab is hidden.

A church typing in a heading owns the caret, so nothing re-renders underneath it:
the words are read back and committed on blur. A paste arrives as its text,
which is the whole of the sanitising story, because nothing is read out of the
DOM except text and the three marks.

## What is deliberately not here

- **No stock photograph library.** A church's website never shows a picture of
  somebody else's building. Where a layout is built around a picture and the
  church has none, the theme's own artwork stands in it (`Drawn` in the kit).
- **No absolute positioning.** Sections are stacks and grids, so a volunteer
  cannot make the mobile site unusable by nudging something.
- **No giving flow of its own.** A giving section links to the platform's page,
  which runs on the church's own Stripe account.
- **No form fields of its own.** A form section links to `/f/<church>/<form>`,
  which already has the validation, the spam protection and the submission path.

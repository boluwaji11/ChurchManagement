# The plan for the pass against the reference

The work this plan describes is on the board as HRT-307 to HRT-336, in the F24
table in [BACKLOG.md](../../BACKLOG.md). This file is the argument behind those
rows: the surveys they came from, the four decisions taken before planning, and
the order the phases go in. Read it before starting any of them.


## Context

ConnectApp replaces software churches pay for, so it has to look better than that
software. Seventeen reference screens from a Brazilian church product were supplied as
the visual target. They are not a style to copy wholesale: they are evidence of a level
of finish, and of a handful of patterns we do not have.

The trigger: the member record was rebuilt as a centred window, and the work kept
turning up unevenness elsewhere. Screens that 404 on a press. Features no screen reaches
any more. Eleven rail entries where seven do. Three ways of drawing a header. Fixing
those one complaint at a time is what we have been doing, and it is not working.

So: survey everything once, name every gap, put each on the board as its own story.

**Decisions taken before planning:**

| Question | Answer |
|---|---|
| Breadcrumbs and a lede under each title | **Both.** CLAUDE.md's "no lede" rule gets a narrow carve-out for screen headers |
| How far toward the reference's colour | **Keep ours.** Take the structure, keep warm stone, ink, ember, the eight hues |
| Charts | **Promote what we have.** No library. Add the two shapes we lack |
| Scope | **Plan, write the work items, then build one at a time** |

---

## What three surveys found

A full route inventory, a design-system inventory and a board-convention survey ran
before this plan. The numbers:

| Finding | Count |
|---|---|
| Screens with a breadcrumb | **0** |
| Screens with a count in a tab label | **0** |
| Different tab implementations | **5** |
| Different stat-tile implementations | **3**, plus an unused one in `packages/ui` |
| Different pagination implementations | **3** |
| Screens where the reader can change the page size | **1** (the report builder) |
| Screens hand-rolling `<table>` | **16**, against **2** using the shared `Table` |
| Screens with a search box | **7** |
| Screens using the filter drawer | **1** |
| Screens missing an empty state | **18** |
| Charting dependencies | **0**, and 1,121 lines of good hand-drawn SVG |

And three dead things worth sweeping: the nav links non-staff to `/directory`, **which
does not exist**; `app/groups/find/` and `find/[id]/` are empty directories; `StatTile`
and `Progress` in `packages/ui` are used only by the gallery.

The nine largest screens, which is where the drift lives: `members/directory.tsx`
(1,378), `services/[id]/plan/order.tsx` (1,058), `settings/households/households.tsx`
(1,025), `forms/[id]/builder.tsx` (892), `giving/page.tsx` (878), `reports/charts.tsx`
(776), `import/wizard.tsx` (718), `members/[id]/page-content.tsx` (703),
`schedule/grid.tsx` (687).

---

## What the reference does

**Lists.** Tabs carry counts (`Todos (344)`). Rows stack name over email. Status is a
pill with a chevron, changed from the row. Dates are relative. Tags are colour chips
with a `+8` overflow. A tick before the avatar marks a complete record. The footer reads
`Mostrando [10 v] membros de 114`, so page size is a control. Event rows carry a
thumbnail; group rows carry a face pile of leaders.

**Records.** A centred window over the dimmed list, a left rail of sections, a footer
with `Editar` and `Fechar`. It opens with avatar, name, and two green badges.

**Numbers.** Stat tiles carry value, label and change (`+2 essa semana`). A half-donut
gauge, a donut with a legend, bars by age band, a line of growth, percentage bars.

**An activity feed,** grouped under day headings, each row linking the record it names.

**Tags are managed:** categories with a default colour, overridable per tag, reorderable
by drag, and the order sets how they print beside a name.

**Roles are explained:** a coloured badge, a sentence saying what the role can do, a face
pile, a chevron into the list.

**What we do not take:** money (payment columns, revenue, ticket sales), messaging (the
WhatsApp button), the blue and its cool neutrals, and the plan meter (`65 de 200
membros`) because we are free.

---

## The sidecar

The reference's left-most strip is a narrow rail of icons that switches *area*, with the
active one labelled vertically, and a second column holding that area's items.

**We should take it, because we already have its content and it is in the wrong shape.**
Our sidebar holds four groups, Overview / People / Gatherings / Church, in a single
232px column as an accordion where only one group opens at a time, with
`section-memory.ts` remembering where each was left. That is a two-level navigation
crammed into one column, and the accordion is the compromise.

**The four groups become the rail. Their items become the second column.** No accordion,
nothing collapsing, nothing to remember opening. The active area is named down the rail
exactly as the reference does it, and the second column can still collapse when a screen
wants the width.

Why it fits us specifically:

- **It is the navigation we already have**, re-expressed. No new information architecture,
  no relearning, and `navFor(role)` already returns exactly these groups.
- **Mobile falls out of it.** Under 768px we show four tabs plus More. The four groups
  *are* four tabs, so the phone and the desktop finally agree.
- **Role scoping gets simpler.** A group whose items a role cannot see drops out of the
  rail. A group leader sees two icons, not an accordion with one open row.
- **It gives Hearth Stage a door** when Phase 2 arrives, without redesigning anything.
- **It is where a second church goes.** We now support somebody belonging to two churches,
  and `/choose-church` is a full page detour. A church monogram in the rail is one tap.

The cost is honest: 64px of rail plus the item column is wider than 232px, against a
1,280px content maximum. The answer is that the item column collapses, which the current
sidebar already does.

Three further ideas the rail makes cheap, listed so they are not forgotten rather than
proposed for now: **density as a rail switch** (Office / Station / Portal are already
real modes in our tokens, and a volunteer picking up a tablet wants the station), the
**dual-shell problem** (`/groups` renders either `AppShell` or `PortalShell` depending on
who is looking, the only screen in the product that does), and **the check-in station**,
which deliberately has no navigation at all and would simply never show a rail.

---

## The plan

Four phases. Phase A builds the vocabulary once so Phase B is mechanical. Every story
enters as `New`; HRT-305 holds the one Active slot until its visual check is done.

### Phase A. The shared vocabulary, in `packages/ui`

Nothing a church sees changes here. Each story ships all states, both themes, three
densities, an entry in `/design`, and passes the CI contrast audit.

| ID | Story |
|---|---|
| HRT-307 | One page header: breadcrumb, title, lede and actions, replacing three mechanisms |
| HRT-308 | The shared data table: one row, one cell, sorting, selection and the empty case |
| HRT-309 | Tabs that carry a count, and one segmented control instead of five |
| HRT-310 | Pagination the reader controls, with the page size as a choice |
| HRT-311 | One relative time, laddering to years, in the church's own language |
| HRT-312 | One tag chip, with its overflow count |
| HRT-313 | A face pile, for a group's leaders and a role's holders |
| HRT-314 | A stat tile that can say "+8 this week", and one of them instead of three |
| HRT-315 | The charts move into the design system, and gain a gauge and a sparkline |
| HRT-316 | The activity feed, out of the member record and into the design system |
| HRT-317 | A status pill that changes the status |
| HRT-318 | How complete a record is, said once and the same way everywhere |

**HRT-307 carries the CLAUDE.md change.** The carve-out is narrow: a *screen header* may
say what the screen is for. Hint text under a field, reassurance under a banner title and
a sentence restating a heading stay banned. `docs/design-system.md` line 441 keeps its row,
reworded to name banners only.

**HRT-308 is the biggest.** Recommendation: extend the existing `Table` shell with sorting
and selection rather than adopting TanStack, and hold TanStack for when virtualisation is
genuinely needed above 200 rows. `ResizableTable` already solves column widths and moves in.

**HRT-315 promotes rather than rewrites.** The charts move to
`packages/ui/src/components/chart/`, shed their `@connectapp/db/rules` coupling for plain
props, and keep the drawing code. Gauge and sparkline are new.

### Phase B. The shell

| ID | Story |
|---|---|
| HRT-319 | The sidecar: four areas in a rail, their items beside it, and the accordion goes |
| HRT-320 | The phone follows the sidecar: four areas, one tab each |

### Phase C. Apply it, one area at a time

Each story is one area and reads "this area now uses the Phase A pieces and nothing
bespoke". Ordered by how often a church looks at them.

| ID | Area |
|---|---|
| HRT-321 | Members: the directory, the record window and every screen under it |
| HRT-322 | Groups: the list, the record, the finder, and the two shells it renders |
| HRT-323 | Events: the list, the record and the roster |
| HRT-324 | Forms: the list, the builder and the responses |
| HRT-325 | The dashboard: tiles that carry a change, and the charts beside them |
| HRT-326 | Reports: the shared table, the promoted charts, and the catalogue that matches them |
| HRT-327 | Settings: every tab to one header and one table |
| HRT-328 | Follow-ups, calendar, incidents, import and website |
| HRT-329 | Giving: the same pass, inside what 0.3 already built |
| HRT-330 | Check-in: the station screens, where the rules deliberately differ |
| HRT-331 | The public pages and the member portal |
| HRT-332 | The print sheets: one paper style across eleven of them |

HRT-330 is late because the station is safety-critical and has its own rules: no
icon-only controls, 7:1 contrast, 56px targets, no navigation at all.

### Phase D. What the reference has that we do not

Features, not polish. Two need a schema change.

| ID | Story |
|---|---|
| HRT-333 | Tags belong to categories, with a colour and an order the church sets |
| HRT-334 | A record says how complete it is, and the directory says which are not |
| HRT-335 | The church's own activity feed, read from the audit log, on the dashboard |
| HRT-336 | Sweep the dead ends: the `/directory` link that goes nowhere, the empty `groups/find` directories, and the components nothing renders |

HRT-333 needs a `tag_categories` table, a `category_id` and a `position` on `tags`, and a
migration. It is the largest single piece of new work and could be dropped without
blocking anything else.

HRT-335 reads the audit log, which is already append-only and already records the actor
and their role, so it needs no new writes.

---

## Critical files

- `packages/ui/src/components/`: Phase A lands here. `table.tsx`, `tabs.tsx`,
  `stat-tile.tsx`, `hue.tsx` are extended rather than replaced; `packages/ui/src/index.ts`
  is the barrel each one joins.
- `apps/web/components/shell/nav.ts`, `shell/sidebar.tsx`, `shell/section-memory.ts`,
  `components/app-shell.tsx`, `components/shell/top-bar.tsx`: the sidecar, HRT-319.
- `apps/web/app/reports/charts.tsx` and `plot.tsx`: moved in HRT-315.
- `apps/web/components/section.tsx` + `app-shell.tsx` + `shell/top-bar.tsx`: the three
  header mechanisms HRT-307 replaces.
- `apps/web/components/pager.tsx` and `components/pages.tsx`: the two paginators, merged
  in HRT-310.
- `apps/web/lib/when.ts` and `apps/admin/components/since.tsx`: merged in HRT-311.
- `apps/web/app/members/directory.tsx`: the hand-rolled table, `HuePill`, `TagChips` and
  `StatusPill` that HRT-308, HRT-312 and HRT-317 absorb.
- `apps/web/app/reports/figure.tsx`, `app/dashboard/tiles.tsx`,
  `app/giving/campaigns/[slug]/campaign-screen.tsx` line 302: the three stat tiles.
- `CLAUDE.md` line 253 and `docs/design-system.md` line 441: the lede rule, in HRT-307.
- `BACKLOG.md` F24 table: where every row above is written.

## Reuse, do not rebuild

`HueTag`/`hueForId`/`HUES` (`packages/ui/src/components/hue.tsx`) · `EmptyState` and its
enforcing test `packages/ui/tests/empty-state-usage.test.ts` · `Pager`/`Step` and `Pages` ·
`ResizableTable` (`components/resizable-columns.tsx`) · `readingLocale()` and
`apps/web/lib/dates.ts`, which already solve the church's locale and which HRT-311 follows
rather than reading the browser · the `Donut`/`Line`/`Columns`/`RowBars` drawing code ·
`navFor(role)`, which already returns the four groups the sidecar needs.

## Board mechanics

- Next free ID is **HRT-307**; the highest in use is HRT-306.
- Rows go in the F24 table in `BACKLOG.md`: `| HRT-n | Title | Reqs | State |`,
  single-space padding, no trailing stop.
- Requirements cited explicitly, never `R24.x`: `check-backlog.mjs` does not expand
  wildcards. Ranges use the literal word `to`: `R24.1 to R24.3`.
- Every row gets a `### HRT-n, how to test it` section in hard-wrapped imperative prose.
- Every row enters as **New**.
- Commits: `feat(design): <lower-case declarative sentence> (R24.15, R24.6)` with a
  `Work item: HRT-n` footer, board updated in the same commit.

## Verification

Per story, before it reaches Resolved:

1. `pnpm typecheck`, `pnpm --filter @connectapp/ui test` (the contrast audit),
   `pnpm --filter @connectapp/i18n test`, `node scripts/check-backlog.mjs`,
   `node scripts/check-member-routes.mjs`, and the em dash check.
2. The component renders in `/design` in all three densities, light and dark.
3. **A signed-in browser check with Playwright.** The harness written during this session
   signs in with `SEED_USER_PASSWORD` and asserts on real screens; it moves into the repo
   as part of HRT-308 so every later story can use it. This is not optional: `/members/new`
   had been 404ing on a click for days, and three rounds of reasoning about Next.js routing
   were wrong until a browser was actually pointed at it.

## Risks

- **Phase C touches every screen.** If anything in Phase A is wrong it is wrong sixteen
  times, so Phase A ships to `/design` and gets looked at before Phase C starts.
- **HRT-308 is a refactor across sixteen screens.** It lands on Members first, is proven
  there, then rolls outward one area per commit.
- **HRT-319 moves the navigation everybody has learned.** It is one story, reversible, and
  worth doing before Phase C rather than after, so screens are only restyled once.
- **HRT-333 is the only schema change here** and can be dropped without affecting the rest.

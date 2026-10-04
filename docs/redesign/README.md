# The redesign, and what we are taking from it

October 2026. A full design pass over the product arrived as a set of HTML prototypes built in
Claude Design. This file is the reconciliation: what the design settles, what the repo keeps, what we
are leaving out, and where the two disagree about how somebody gets in.

`handoff.md` is the designer's own brief, unedited. `tokens.md` is the colour table it shipped with.
`screen-map.md` maps each design screen to the routes it was drawn from. `design/` holds the
prototypes themselves.

## Read the prototypes, do not port them

Open any file in `design/` straight in a browser. `support.js` is the prototype runtime and `data.js`
is its sample data. Both are there so the prototypes run. Neither belongs in `apps/web`, and the
inline-style approach the prototypes use is a property of the drawing tool.

`data.js` holds sample people, households, gifts and funds. It stays in this folder. The rule that
fake data must never be loadable into a real church covers it.

The persona files (`Pastor`, `Group Leader`, `Member Portal`, `Member Web`, `Network Admin`,
`Check-in Station`) are one-line wrappers that load `Hearth A - Warm Office.dc.html` with a
`persona` prop. Warm Office is the whole staff app and the single source. Open it and use the Tweaks
panel to switch persona, layout and theme.

## The colour system is already ours

The design was drawn on top of `packages/ui/tokens/color.json`. The fonts are the three the app
already loads. Twenty-two of the twenty-four hue values match to the decimal. There is no palette
migration in this work.

| Design token | Ours |
|---|---|
| `--c0` | `stone 50`, the app background |
| `--c12` | `stone 100`, sunken |
| `--c7` | `stone 200`, border |
| `--c8` | `stone 300`, control border |
| `--c4` | `stone 500`, subtle text |
| `--c6` | `stone 600`, muted text |
| `--c1` | `stone 900`, ink |
| `--surface` | `white` in light, `stone` one step up from the page in dark |
| `--accent-fill` | `ink 600` |
| `--c5` | `ember 500` |
| `--c9` | the danger ramp |
| `--h-<hue>-t` / `-b` / `-x` | `--hue-<name>-100` / `-500` / `-700` |

The numbered names are an artefact of the drawing tool. `tokens.md` says to rename them, and our
semantic names already exist, so nothing in `apps/web` or `packages/ui` adopts a `--cN`.

### Three values we are keeping as they are

Amber, citron and fern text came back lighter than ours:

| Hue, text shade | Design | On white | On its own tint | Ours | On white | On tint |
|---|---|---|---|---|---|---|
| amber 700 | `oklch(0.572 0.132 62)` | 4.60 | **3.85** | `oklch(0.524 0.132 62)` | 5.62 | 4.70 |
| citron 700 | `oklch(0.582 0.126 108)` | **4.18** | **3.57** | `oklch(0.518 0.126 108)` | 5.45 | 4.65 |
| fern 700 | `oklch(0.522 0.128 147)` | 5.16 | **4.36** | `oklch(0.508 0.128 147)` | 5.48 | 4.63 |

Those three are the yellow-green end of the spectrum, where a hue that reads as itself and a hue that
clears 4.5:1 pull against each other. A hue's text shade is used on the matching tint, which is the
harder of the two numbers, and the design's three all come in under 4.5 there. Citron misses it on
plain white as well. Ours clear both with room. The design system's own rule decides this one: if a
trend costs contrast, the trend loses.

Figures from `pnpm --filter @hearth/ui contrast`, which audits all 66 pairs on every run.

## What the redesign actually changes

Four things, in the order we are building them.

1. **The shell.** A collapsible left sidebar, icons only when collapsed, and a slim top bar carrying
   the page title and one filled action belonging to that page. Under about 760px it becomes bottom
   tabs. Today's single horizontal bar holds eleven links and has outgrown itself.
2. **Navigation scoped to the role.** An administrator sees thirteen entries, a pastor nine, a group
   leader two, and a check-in volunteer none at all. Today everybody gets one list with pieces
   hidden inside it.
3. **Screens we do not have.** A dashboard with a closable setup checklist and reorderable number
   tiles. A command palette on Cmd+K, with no global search box in the top bar. A notifications bell.
   A 380px filter drawer on People.
4. **A pass over what exists**, for spacing, headings, per-page actions, empty and loading and error
   states, and the print sheets.

The density modes we already have line up with what the prototypes call `chrome`: `office`,
`station`, `portal`. Three names, same three meanings.

## What we are not taking

The design covers the whole product, including the parts this repo has deliberately set down.
CLAUDE.md is the authority and it does not move for a design file.

| In the design | Why it is not being built |
|---|---|
| Giving: the nav entry, Record gift, fund totals, the member checkout and its processing-fee toggle | Money is the last thing this product grows. Deferred until asked for by name. |
| Songs: the library and the sequence builder | Hearth Stage is being built elsewhere with its own library. |
| The email mockups in States and Messages: invitation, serving request, receipt, follow-up digest | Messaging is deferred. There is no send path to draw these for. |
| Network Admin: the five-church overview and the comparison bars | Multi-site is a settled non-goal for v1. `/choose-church` serves the different case of one person who belongs to more than one church. |
| Calendar and Reports as nav entries | Both are 1.0 features with stories already on the board, behind the work in front of them. |

The rest of States and Messages, the empty states, first-run states, errors and loading, is in scope
and is its own story.

## The journeys, against what the product does

`design/Hearth Journeys.dc.html` draws seven ways in, website to first screen. Six of them match
what is built. Where they differ, the backlog section "How somebody gets an account" is the decision,
because it was argued from how a congregation's directory has to be protected rather than from how a
screen looks.

| Journey | Where it stands |
|---|---|
| Maria starts the church | Matches `/`, `/sign-up`, `/create-church`, `/sign-in`, `/setup`. The design's app home omits that a new church is **provisional** until a person has looked at it (HRT-115). The gate stays, and the setup checklist sits under the banner that says so. |
| Pastor Mike is invited | Matches invitations (HRT-108). The design opens on an invitation email we cannot send while messaging is deferred, so today an administrator passes the link on by hand. The screens either side are right. |
| Samuel gets his group | Matches. Two nav entries and nothing else in the church is exactly the role-scoped sidebar. |
| Ruth opens the station | Sign-in offers "Open a check-in station", a six-digit code from Settings, Stations pairs the tablet, and it stays in station mode. Worth checking the sign-in entry point exists. |
| Hannah signs up on the church's site | The design shows an embedded "My account" panel on the church's own domain, with no approval step. Our door is the church's join link, and the approval queue was built and taken out already, so the two agree. The panel is the join link embedded. |
| Elijah finds a group first | Matches `/g/<slug>` and `/g/<slug>/<id>`, built signed out. **One open question:** the design has him added to the group on the spot with the leader told, and R9.5 has a join request the leader approves. Flagged below. |
| Ann across five churches | Out, with the rest of the network work. |

### Open question, group joining

R9.5 specifies a public group finder "with join requests and approval". The design adds the person to
the group immediately and tells the leader. A small group with a cap and a leader who knows everybody
is a different thing from a church directory, so there is a real argument either way. Until it is
settled, approval stays, because taking a gate away is reversible in a morning and letting strangers
onto a roster is not.

## Where the design is the authority

Colours, type, spacing, copy, states and validation rules in the prototypes are final. Match them.
Where a prototype and `docs/data-model.md` disagree about what a record holds, the repo wins and the
prototype is showing presentation.

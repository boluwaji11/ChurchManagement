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
| Elijah finds a group first | Matches `/g/<slug>` and `/g/<slug>/<id>`, built signed out. The design adds him to the group on the spot; the leader approves the request instead, settled below. The screens either side are right. |
| Ann across five churches | Out, with the rest of the network work. |

### Group joining, settled October 2026

R9.5 specifies a public group finder "with join requests and approval". The design adds the person to
the group immediately and tells the leader. **Approval stays.** A leader decides who is in their
group. The design's screens for the finder and the group page are right; the button asks rather than
joins, and the bar changes to Asked.

## Where the design is the authority

Colours, type, spacing, copy, states and validation rules in the prototypes are final. Match them.
Where a prototype and `docs/data-model.md` disagree about what a record holds, the repo wins and the
prototype is showing presentation.

## The words, exactly

The prototype holds a title and a main action for every screen, and these are the words. Our
catalogue was aligned to them in HRT-201, so a key's value is the design's string.

| Screen | Title | Top-bar action | Where it is now |
|---|---|---|---|
| Dashboard | Dashboard | none | HRT-203 |
| Pastor home | Home | Add care note | Needs the pastor persona (HRT-202) |
| People | People | Add person | Built |
| Person | Person | Add note | Title is the person's name. Action is still Edit, HRT-208 moves it |
| Edit person | Edit person | none | Built |
| Follow-ups | Follow-ups | Start follow-up | Title built, action HRT-208 |
| Check-in | Check-in | Check in | Title built, action HRT-208 |
| Labels | Labels | none | HRT-208 |
| Room rosters | Room rosters | none | Built |
| Incidents | Incidents | File report | Title built, action HRT-208 |
| Services | Services | New service | Title built, action HRT-208 |
| Service plan | Service plan | Add item | Title built, action HRT-208 |
| Live service | Live service | none | Built, always dark |
| Serving | Serving | Send requests or New team | Title built, action HRT-208 |
| Schedule | Schedule | none | Built |
| Groups | Groups | New group | Title built, action HRT-208 |
| Group | Group, or My group for a leader | Add member | Title is the group's name, action HRT-208 |
| Forms | Forms | New form | Built |
| Settings | Settings | Invite person | Title built, action HRT-208 |
| Import | Import | none | Built |
| Duplicates | Duplicates | none | Built |
| Celebrations | Celebrations | none | Built |
| Giving, Songs, Calendar, Reports, Churches | | | Excluded, see above |

An entry's sidebar label is the same word as its title. The one difference is People, where the
prototype's nav says People and the screen is also People; ours said Directory in both places and
now says People.

### The measurements the shell is built to

Taken from `Hearth A - Warm Office.dc.html` rather than approximated.

| Part | The design |
|---|---|
| Sidebar | 232px, 64px collapsed. 20px padding, 12px at the sides (10px collapsed). 24px between its three blocks. `--c12` behind it, hairline on the right. 200ms on `cubic-bezier(0.16, 1, 0.3, 1)`. |
| Brand | A 32px ember square, 10px radius, white flame at 16px. "Hearth" in Fraunces 18/20 over the church's name at 12px. |
| Collapse toggle | 30px square, 8px radius, `panel-left-close` and `panel-left-open` at 18px. |
| Nav row | 36px tall, **8px radius**, 2px between rows, 10px gap, 10px side padding, 13px at weight 500, icon 18px. Current row is `--surface` with `--c1` and a 1px/3px shadow; the rest are `--c6`. Count right-aligned at 12px. |
| Person row | 10px radius, hairline border, `--surface`. 32px round avatar on its hue, name 13px/500, role 12px, `chevrons-up-down` at 16px. |
| Sign out | 36px, 8px radius, `--c6`, `log-out` at 18px. |
| Top bar | 14px padding, 24px at the sides, hairline under, canvas behind, 12px gaps. Title in Fraunces **20/24**. Action 36px, 14px side padding, 10px radius. |
| Body | **28px top, 24px sides, 96px bottom. 1280px maximum, left aligned.** Each screen is a column with 28px between its blocks. |
| Tab bar | Five entries, 6px padding over the safe area, 22px icons, 11px labels, current one in the accent at 600. |
| Office density | 40px buttons and inputs, 36px rows, 16px icons inside a control, 14px side padding, 10px radius. |
| Icons | Lucide at **1.75 stroke**, 16px in a control and 18px in the navigation. |
| Radius | 8 for small controls and menu rows, 10 for buttons and inputs, 12 to 14 for cards, full for pills. |

Three of these moved our own tokens, because the tokens were the thing that was off: `--radius-sm`
went from 6px to 8px, office density went from 32px taps and 20px icons to 40px and 16px, and every
Lucide icon now draws at 1.75 through one rule in the base layer.

**There is no search box in the top bar.** `showSearch` is false in the prototype and the brief says
it plainly: Cmd+K opens the palette from anywhere, and lists carry their own inline search.

**Rooms, Labels and Incidents are reached from Check-in**, as the design has them, rather than taking
three rows down the side.

### Still to come, by story

The bell in the top bar is HRT-207. It needs somewhere to read notifications from, and the
prototype's list is sample data, so it arrives with its source rather than as a control that does
nothing. The palette behind Cmd+K is HRT-205.

The in-context help button (R22.2) is not in the design's top bar and has come out of the chrome.
`apps/web/components/help.tsx` is still there and is now unreferenced, so R22.2 needs somewhere to
live.


## Taken off the Person screen, October 2026

The instruction is to replicate the redesign and remove what is not in it. The person's page in
`Hearth A - Warm Office.dc.html` is the back link, the header, and four cards: Contact, Household,
Giving this year, Groups and teams, then a full-width Timeline.

These came off that screen. The server actions, the repo functions and the components are all still
in the tree, so any of them goes back in one commit if it is wanted.

| Taken off | Requirement | Component still there |
|---|---|---|
| Custom fields | R1.12 | `apps/web/app/people/custom-fields.tsx` |
| Milestones | R2.6 | `apps/web/app/people/milestones.tsx` |
| Relationships | R2.5 | `apps/web/app/people/relationships.tsx` |
| Serving teams, blockouts, frequency | R10.3 to R10.5 | `apps/web/app/people/availability.tsx` |
| Saved lists this person is on | R1.14 | the `listsForPerson` read |
| Tags | R2.x | `apps/web/app/people/tag-editor.tsx` |
| The notes list | R2.7 | `apps/web/app/people/note-form.tsx`, still used by Add note |
| Follow-ups and tasks | R5.5 | `apps/web/app/people/followups.tsx`, still used elsewhere |
| Background check | R2.10, R21.11 | `apps/web/app/people/checks.tsx` |
| Archive | R2.x | `apps/web/app/people/archive-button.tsx` |

**Giving this year is the one card from the design that is not built.** It needs gift and fund
tables, and money is deferred by standing instruction. Say the word and it gets built with the rest
of R13.

**Message** is in the design and is now on the page. The form is the design's, with how to send it
and what to say. It cannot send: a church supplies its own Resend, SMTP or Twilio credentials and
that path is not built, so the dialog says so rather than a button quietly doing nothing.

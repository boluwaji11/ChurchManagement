# Handoff: Hearth church management platform redesign

## Overview
Hearth is free church management software for churches of 50–500 people. This redesign covers the whole product for six personas: Administrator, Senior pastor, Group leader, Check-in volunteer, Member, and Network admin. It also covers how each persona enters the product from the church's own website.

Target repo: `boluwaji11/ChurchManagement` (`apps/web`, Next.js). `github.md` maps each design screen to the route files it was built from.

## About the design files
The files in `design/` are **design references built in HTML**. They are working prototypes that show the intended look and behavior, not production code to copy. Rebuild them in `apps/web` using its existing patterns: App Router pages, its components, and its data layer. Do not ship the HTML or port its inline-style approach. Lift the values (colors, sizes, copy, rules) into the codebase's own styling system.

Open any `.dc.html` file directly in a browser. `support.js` is the prototype runtime and `data.js` holds the sample data. Neither belongs in the app.

## Fidelity
**High fidelity.** Colors, type, spacing, copy, states and validation rules are final. Match them closely.

## Files
| File | What it is |
|---|---|
| `design/Hearth A - Warm Office.dc.html` | **The whole staff app, single source.** Every office screen for every persona. Persona and start screen come from props. |
| `design/Hearth A - Pastor.dc.html` | Loads Warm Office with `persona="pastor"` (home: Pastor home) |
| `design/Hearth A - Group Leader.dc.html` | `persona="leader"` (home: My group) |
| `design/Hearth A - Check-in Station.dc.html` | `persona="volunteer"`: full-screen tablet kiosk |
| `design/Hearth A - Member Portal.dc.html` | `persona="member"`: member app at phone width |
| `design/Hearth A - Network Admin.dc.html` | `persona="network"`: multi-church overview |
| `design/Hearth A - Member Web.dc.html` | Member experience embedded in the church's website (desktop) |
| `design/Hearth States and Messages.dc.html` | Empty / first-run states, emails (invitation, serving request, receipt, follow-up digest), errors and loading |
| `design/Hearth Journeys.dc.html` | Sign-up and invite journeys per persona, website to first screen. Includes a "Step through" mode. |
| `design/JourneyScreen.dc.html` | The mock screens used inside Journeys |
| `design/data.js` | Sample data: people, households, groups, teams, funds, rooms, plan items, hue palette |
| `tokens.md` | Every color token, with light and dark values |
| `github.md` | Design screen → repo route map and sync history |

The Tweaks panel on each page has `persona`, `layout` (auto/desktop/mobile) and `theme` (light/dark/auto) controls, so you can view any screen as any persona at any size and in either theme.

## Product rules (apply everywhere)
- **Embedded, not standalone.** The member side lives inside the church's website. Members sign up there and are in immediately, with no request and no approval step. Staff never self-register. An admin invites them with a role, and the role controls what they see.
- **Check-in volunteers have no account.** A tablet is paired once with a six-digit code from Settings → Stations, then stays in station mode.
- **Role-scoped navigation.** Each persona sees only its own nav (see Personas). Group leaders see only their groups. Confidential care notes are visible to the Pastoral role only.
- **One main action per page.** The filled button in the top bar is specific to the page. Some pages have none (see the table below).
- **No global search bar in the top bar.** ⌘K opens the command palette from anywhere. Lists have their own inline search.
- **Every action validates and confirms.** Buttons open a form or sheet, check required fields, then show a toast confirming what happened (e.g. "Kwame Boateng added to New."). Copy is plain and specific.

## Personas
| Persona | Name in mocks | Home screen | Navigation |
|---|---|---|---|
| Administrator | Maria Carter | Dashboard | Dashboard, People, Follow-ups, Check-in, Giving, Calendar, Services, Songs, Serving, Groups, Reports, Forms, Settings |
| Senior pastor | Mike Sullivan | Pastor home (care list, prayer, Sunday, newcomers) | Home, People, Follow-ups, Services, Songs, Serving, Groups… |
| Group leader | Samuel Mensah | My group (Young adults) | My group, Calendar |
| Check-in volunteer | Ruth Bennett | Station: find family → select children → print | none (kiosk) |
| Member | Hannah Lindqvist | Portal home: serving requests, kids check-in, giving, groups | bottom tabs on phone, top nav on web |
| Network admin | Ann Walker | Churches overview (5 churches, health, attendance, giving) | Churches, Reports |

## Screens (Warm Office)
Top-bar main action per screen is in brackets; "none" means no button.

- **Dashboard** [none]. Setup checklist (closable with the × in its top right, steps toggle), draggable KPI tiles (drag to reorder), Sunday attendance chart, upcoming events, follow-ups due.
- **People** [Add person]. Inline name/email search. Buttons: Duplicates (with count badge), Celebrations, Print, Export, Filter, Import. **Filter** opens a right-side drawer, 380px wide, with Status (All/Members/Regulars/Visitors with counts), Tags, Joined, and Missing email or phone. The footer has Clear and "Show N people". The Filter button reads "Filter · N" when filters are active. **Export** downloads `people.csv` (Name, Status, Household, Email, Phone, Tags, Joined) for the current filtered set. Paginated, 20 per page.
- **Person** [Add note]. Profile, household, groups, giving, notes timeline. "Edit" opens the Edit person page.
- **Edit person** [none]. Full page with Details (first, last, email, phone, birthday, household, address), Status pills, Tags, and Custom fields. Validation: first name required; email must be a valid format.
- **Follow-ups** [Start follow-up]. Kanban board by stage, with drag between columns.
- **Check-in** [Check in]. Room occupancy and capacity, checked-in children, Incidents, Labels, Room rosters (print).
- **Labels** [none]. Toggles for room name, allergies, pickup code, date and service, and parent tag. Label size select. Live label preview and "Print a test label".
- **Giving** [Record gift]. Fund totals and a gifts list.
- **Calendar** [New event].
- **Services** [New service]. Cards for upcoming services (date and time, name, theme, item count and minutes, or "Not planned yet"). Clicking a card opens its plan.
- **Service plan** [Add item]. "All services" back link, service switcher strip, drag-to-reorder items, running clock times computed from the service start, total vs. a 75-minute target, Go live, and Print run sheet.
- **Live service** has a full-screen dark view with a live clock and current/next item. It always uses the dark palette.
- **Songs** [New song]. Library and a sequence builder.
- **Serving** [Send requests or New team]. Schedule / Teams toggle. *Schedule*: team picker, month grid of positions × dates, drag volunteers from the pool into slots, conflict warnings (blockouts, double-booking), and accepted/pending/declined states. *Teams*: card per team with positions, volunteer count, and an open-spots pill ("14 open" or "Fully staffed"), plus "Open schedule".
- **Groups** [New group] and **Group** [Add member]. Group detail and attendance.
- **Reports** [New report].
- **Forms** [New form]. Form list and a drag-and-drop builder.
- **Settings** [Invite person]. Left menu grouped: *Church* (Church, Team and roles, Website, Funds), *Check-in* (Rooms, Stations), *People* (Tags, Custom fields, Follow-up stages), *You* (Privacy, Security, Appearance), *Data* (Export). Each section is fully specified in the prototype, e.g. Stations pairing code, room capacity steppers, password rules (10+ characters), and Appearance (Light/Dark/System).
- **Import** has a four-step wizard. **Duplicates** reviews and merges. **Celebrations** lists birthdays and anniversaries.
- **Print previews** cover the people list, service run sheet and room rosters. They show a letter-width paper sheet and always use the light palette.
- **Sign in** includes **Forgot password**: email form, then a "Check your email" confirmation.

## Added in the latest round
- **Notifications:** a bell in the top bar with an unread count and a panel per persona. Click an item to go to its screen; "Mark all read".
- **Member giving checkout:** Amount/fund/frequency → Continue → summary with an optional "cover the processing fee" toggle (2.9% + $0.30) → payment method (saved cards, bank, add new) → Give. An expired card shows an inline decline message and nothing is charged.
- **Member kids check-in:** choose which children are coming (allergy badge shown), check in, get the pickup code, and use "Change who's coming".
- **Member serving decline:** "Can't make it" asks for a reason (Away, Not well, Work, Something else) with an "Ask my team to swap" toggle, and the confirmation reflects the choice.
- **Network compare:** bars ranking churches by Attendance, Giving per person, Growth or People, plus a one-line summary of who leads and who trails.

## Responsive behavior
- Desktop has a collapsible left sidebar (icons only when collapsed) and a top bar with the page title and main action.
- Mobile (under ~760px, or `layout=mobile`) uses bottom tab navigation. Grids collapse to one column and drawers become full width.
- Layouts use flex/grid with wrapping. No fixed widths on text containers.

## Theme / dark mode
- Every color is a token (see `tokens.md`). Dark mode swaps values under `html[data-theme="dark"]`, and `auto` follows `prefers-color-scheme`.
- In dark mode, cards (`--surface`) sit one step lighter than the page background.
- Filled primary buttons use `--accent-fill`: `oklch(0.455 0.118 285)` in light and `oklch(0.5 0.13 285)` in dark, so white text keeps at least 4.5:1 contrast. Links and accent text use the lighter accent token.
- Category hues (rose, amber, citron, fern, teal, sky, indigo, violet) come as tint / base / text triples (`--h-{name}-t/-b/-x`), each with dark values.
- **Always light:** check-in kiosk, print previews. **Always dark:** live service mode.
- The staff app switches theme in Settings → Appearance. Member Web follows the device by default and has a theme button in its header.

## Design tokens (key)
| Role | Token | Light | Dark |
|---|---|---|---|
| App background | `--c0` | oklch(0.985 0.003 75) | oklch(0.155 0.003 75) |
| Sunken / page | `--c12` | oklch(0.967 0.005 75) | oklch(0.173 0.005 75) |
| Card surface | `--surface` | white | oklch(0.215 0.008 75) |
| Ink (text) | `--c1` | oklch(0.198 0.009 75) | oklch(0.942 0.009 75) |
| Muted text | `--c6` | oklch(0.442 0.013 75) | oklch(0.698 0.013 75) |
| Subtle text | `--c4` | oklch(0.556 0.014 75) | oklch(0.584 0.014 75) |
| Border | `--c7` | oklch(0.925 0.008 75) | oklch(0.215 0.008 75) |
| Control border | `--c8` | oklch(0.863 0.010 75) | oklch(0.277 0.010 75) |
| Primary fill | `--accent-fill` | oklch(0.455 0.118 285) | oklch(0.5 0.13 285) |
| Brand ember | `--c5` | oklch(0.742 0.162 62) | same |
| Danger | `--c9` | oklch(0.558 0.198 25) | lightened |

**Type:** Fraunces (serif) for page titles (28/34), section titles (20–22) and big numbers (40/44). Inter for UI at 14/20 body, 13 secondary and 12 meta, with weights 400/500/600. JetBrains Mono for codes (pickup codes, pairing codes, file names, clock times).
**Radii:** 8 for small controls and menu items, 10 for buttons and inputs, 12–14 for cards, 999 for pills and avatars.
**Control heights:** 34–36 compact buttons, 38–40 inputs and standard buttons, 44 for primary on auth screens. Mobile touch targets are at least 44.
**Shadows:** cards are flat with a 1px border. Popovers use `0 4px 8px oklch(0 0 0/.04), 0 12px 32px oklch(0 0 0/.10)`. The drawer uses `-8px 0 24px oklch(0 0 0/.12)`.
**Icons:** Lucide at 1.75 stroke, usually 16px in buttons and 18px in nav.

## State and data
- `data.js` shows the shapes the UI expects: people (status Member/Regular/Visitor, tags, household, joined), groups, teams (positions, pool), serving assignments (`team|position|date` → {name, status}), blockouts, funds, rooms (capacity, ratio, ages), plan items (type, title, who, min), follow-ups (stage, owner), and churches for the network view.
- `docs/data-model.md` in the repo is the source of truth. Where they differ, the repo wins and the design shows presentation only.

## Assets
There are no raster assets. Photo areas are striped placeholders where real church photos will go. Icons are Lucide. The fonts are Google Fonts (Fraunces, Inter, JetBrains Mono).

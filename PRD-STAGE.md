# Hearth Stage, product requirements

| | |
|---|---|
| **Product** | Hearth Stage, the worship presenter in the Hearth platform. |
| **Phase** | Phase 2. Outline in [PRD.md section 8.23](PRD.md). This document is the build specification. |
| **Status** | Draft 1, October 2026. Written before any Stage code. |
| **Board** | [BACKLOG-STAGE.md](BACKLOG-STAGE.md) |
| **Architecture** | [docs/stage-architecture.md](docs/stage-architecture.md) |
| **Contract with Phase 1** | [docs/stage-sync-contract.md](docs/stage-sync-contract.md) |

Requirement IDs in this document are `ST<domain>.<n>`. The eighteen `S1` to `S18` items in PRD.md
section 8.23 are the outline those IDs expand; section 22 maps every one of them to the requirements
that deliver it.

---

## 1. Why Stage exists

The management system owns the Sunday loop up to the moment the first song starts, and then hands the
whole thing to a different vendor. Planning Center plans the service and exports it to ProPresenter
through an import that loses the arrangement. ProPresenter runs the screens and knows nothing about
the church. The loop breaks in the one place a volunteer has to stand in front of six hundred people.

Stage closes it. It reads the plan Maria built and the songs James chose, out of the same database,
with no export, no import, and no file passed on a USB stick.

### Stage does not win on features

OpenLP, FreeShow, Quelea, and Church Presenter are free, mature, and good at putting words on a wall.
A nineteenth presenter that puts words on a wall slightly differently is worth nothing. Stage is
worth something because of one property no other presenter has: **it already knows this Sunday.** The
plan, the song order, the key, the arrangement, the scripture reference, the announcement list, and
who is on the team. All of it is already in Hearth before the laptop is opened.

Everything in this document is scoped against that. A feature that makes Stage a better standalone
presenter and does nothing for the loop is deferred. A feature that shortens the distance between the
plan and the screen comes first.

### The design case

**10:28 on a Sunday.** The service starts at 10:30. The worship leader changed the song order at
10:15 from a phone in the car park. The laptop is on battery, running on the church wifi that drops
every few minutes, driving a projector through an HDMI adapter that was bought in 2017. The person
operating it is sixteen years old and has opened Stage twice.

Stage has to be running the right set within two minutes, and it has to keep running when the wifi
goes. Every decision in this document is tested against that paragraph.

---

## 2. Users

**James, worship leader, 34, volunteer, four hours a week.** Picks the songs, sets the keys, builds
the arrangement. He is the person who already pays for ProPresenter out of his own pocket, or runs a
copy from 2016, or builds slides in PowerPoint on Saturday night. He is the reason Stage exists and
the person who decides whether the church adopts it.

**The Sunday operator, age 14 to 70, briefed once.** Sits at the laptop and presses a key when the
song moves on. Rotates weekly. May never have used Stage before this morning. Cannot be trained, so
the control surface has to be obvious at a glance and impossible to break: the operator must not be
able to delete a song, edit lyrics, or lose the plan by pressing the wrong thing.

**Maria, administrator, non-technical.** Does not open Stage. She feels it, because the announcement
loop on the screens before the service is the one she typed into Hearth on Thursday.

**The production volunteer, where a church has one.** Runs the livestream, wants the lower third
keyed over camera, owns a Stream Deck, and is the only person in the building who knows what NDI is.
Stage must not require them, and must not insult them when they show up.

---

## 3. Settled decisions for Stage

Carried from PRD.md section 2, or settled here. These are not reopened during build.

| Decision | Choice | Why |
|---|---|---|
| Delivery | Electron desktop, macOS, Windows, Linux | The output has to drive real displays, hold a video decode pipeline, and run with the network off. A browser tab cannot do the first or the third. |
| Price | Free, like the rest of Hearth | Settled in PRD.md section 2. No paid tier for Stage, ever. |
| Offline | Offline first. One sync, then the network is optional. | The building's internet is not a Sunday dependency. |
| Data direction | Stage reads plans and songs. It writes usage. | A read-only client has no merge problem to solve. Section 6 depends on this. |
| Shared code | `packages/songs` is imported by both the web app and Stage | Written once, so a chart in the music stand view and a slide on the wall can never disagree. |
| Song storage | The platform database is the library. Stage holds a cache. | Stage never becomes a second place songs live. |
| Media storage | Backgrounds live on the operator's disk. Synced media is a quota'd platform asset. | No video hosting, carried from the platform's hard constraints. |
| Licence | AGPL-3.0 | Same as the platform. |
| Lyrics and copyright | Stage ships with no song content of any kind | Lyrics are the church's CCLI responsibility. Bundling any would make it ours. |
| Self-hosting | Unsupported, same as the platform in v1 | Stage talks to hosted Hearth. The source is public. |

### Non-goals, stated so they stop coming back

Audio mixing. Lighting control. Video switching. Ableton and MultiTracks session playback. A built-in
song search against the internet. Slide design as a creative tool. A theme marketplace.

Those are separate products with separate hardware and separate audiences, and pretending otherwise
is how Stage never ships. A church that needs them already owns a mixer, a lighting desk, and a
switcher, and Stage is better used as one well-behaved source into those than as a bad imitation of
them.

---

## 4. Release sequence

Five releases. Labelled `S0.1` to `S1.0` so they are never confused with the platform's own versions.
Each is defined by what a church can do on a Sunday with it.

### S0.1 The slide

Internal, plus one church's midweek rehearsal. Fixture data, no sync.

The shared `packages/songs` domain, the Electron shell with a control window and one output window,
lyric slides rendered from sections following an arrangement sequence, one theme, text that fits the
screen, and keyboard operation with no mouse.

**Exit criteria:** a worship leader runs a four-song set on a second display from fixture data, with
the network off and the trackpad untouched, and nothing on the output window has a visible seam, a
cut-off line, or a flash between slides.

### S0.2 The plan

The release that justifies the product. Requires platform 0.4 to have shipped the song library and
the sync API.

Device pairing, delta sync, the local SQLite cache, the service plan as the deck, scripture slides
with verse splitting, usage pushed back for the CCLI report, and a cold start that lands on the right
service with one choice.

**Exit criteria:** a plan edited in Hearth on Saturday night is on the screen on Sunday morning
without anyone exporting a file, and the whole service runs after the network cable is pulled out
mid-set. The songs used appear in the platform's CCLI report on Monday.

### S0.3 The room

What makes Stage usable as the church's only presenter.

Stage display and confidence monitor, multi-output mapping with independent content per output,
still and video backgrounds with per-slide overrides, countdown timers and clocks, the pre-service
announcement loop, and crash recovery.

**Exit criteria:** one church runs four consecutive Sundays on Stage alone, with ProPresenter
uninstalled, including a deliberate mid-service process kill that recovers to the live slide in under
five seconds.

### S0.4 The team

Everything that happens when more than one person is involved.

Remote control from a phone on the local network, hotkeys and macros, Stream Deck, MIDI and OSC,
audio and video as plan items, and props and overlays shown independently of the slide.

**Exit criteria:** the worship leader advances the set from a phone on stage while the operator holds
the laptop, and a Stream Deck button fires the correct cue with the laptop screen asleep.

### S1.0 The broadcast and the move

Public launch of Stage.

NDI and alpha-keyed output, bilingual lyrics and caption output, theme and template editing, live
camera input, import from the five presenters churches are leaving, signed and notarised builds for
three operating systems, and auto-update that will not touch a Sunday.

**Exit criteria:** ten churches have moved to Stage from a paid presenter, a livestream carries a
keyed lower third from Stage into OBS over NDI, and a ProPresenter library of 300 songs imports with
section labels intact.

### Beyond S1.0

Stage's own theme sharing between churches. Lyric translation assistance. A touch-first tablet build
of the control surface. Rehearsal mode that plays the reference track against the slides. None of it
is specified here.

---

## 5. Domain 1. Device, pairing, and identity

Stage is a device belonging to a church, and the church has to be able to see it and revoke it.

| ID | Rel | Requirement |
|---|---|---|
| ST1.1 | S0.2 | **Pairing by short code.** An admin generates a pairing code in Hearth. The operator types it into Stage once. Stage receives a device token and the church's identity, and never asks again. |
| ST1.2 | S0.2 | The pairing code is six characters, single use, and expires in fifteen minutes. |
| ST1.3 | S0.2 | The device token is stored in the operating system keychain, never in a file next to the cache, and never logged. |
| ST1.4 | S0.2 | A paired device appears in the platform's device list with its name, platform, last sync time, and a **Revoke** control, alongside the active session list (R1.10). |
| ST1.5 | S0.2 | A revoked device stops syncing at its next attempt, and **keeps its cache and keeps working for the service in progress**. Revocation is not a kill switch aimed at a Sunday morning. |
| ST1.6 | S0.2 | The device token is scoped: read on plans, songs, arrangements, scripture, and the team roster for the services it syncs. Write on song usage. Nothing else, enforced server side. |
| ST1.7 | S0.2 | Stage holds no user account and no password. The device is the identity, so an operator never signs in. |
| ST1.8 | S0.3 | Stage names itself after the machine on first run, and the name is editable, because a church with three laptops needs to tell them apart in the device list. |
| ST1.9 | S1.0 | Multi-campus: a device is paired to one campus, and only that campus's services sync. |

*Accept ST1.1:* from a clean install, an operator who has been handed a six character code is looking
at this Sunday's plan in under ninety seconds, having typed nothing else.

*Accept ST1.6:* an adversarial test calls every platform API path with a Stage device token, including
people, giving, and check-in, and every call outside the scope above is refused.

---

## 6. Domain 2. Sync and the local cache

The single most important property in this document: **once synced, Stage does not need the network.**

| ID | Rel | Requirement |
|---|---|---|
| ST2.1 | S0.2 | **Delta sync by cursor.** Stage asks what changed since its last cursor and receives only that. A full pull happens once, on pairing. |
| ST2.2 | S0.2 | Synced entities: services and plans, plan items, songs, song sections, arrangements, arrangement media metadata, resolved scripture text, themes, and the team roster for the service. |
| ST2.3 | S0.2 | The cache is a local SQLite database holding the same shape as the platform records, so rendering reads one store whether the network is up or down. |
| ST2.4 | S0.2 | **Stage is read-only on everything it pulls.** Nothing in Stage edits a song, a plan, or a lyric. There is therefore no merge, no conflict resolution, and no divergence. |
| ST2.5 | S0.2 | Song usage is the only write. It is queued locally, pushed with a client-generated identifier, and safe to retry. |
| ST2.6 | S0.2 | Sync runs on launch, on a timer while the network is up, and on demand from a visible control. |
| ST2.7 | S0.2 | **Sync never blocks the render path.** A sync in flight cannot delay a slide advance, and a failed sync cannot stop a service. |
| ST2.8 | S0.2 | The cache states what it is: the control surface shows the last successful sync time, and says plainly when the plan on screen is older than the one on the server. |
| ST2.9 | S0.2 | Media files sync by content hash into a local cache directory, resumable, and are verified before use. A missing background degrades to the theme's solid colour rather than to a broken slide. |
| ST2.10 | S0.3 | **Pre-service prefetch.** Stage pulls everything for the next seven days of services, so Sunday needs no network at all. |
| ST2.11 | S0.3 | A cache size ceiling with least-recently-used eviction on media, and a visible figure for what Stage is using on disk. |
| ST2.12 | S0.3 | An archived song or plan is tombstoned in the cache and hidden, and is retained for the service in progress if it is live on screen. |
| ST2.13 | S1.0 | Export the cache as a portable bundle, so a second laptop is prepared from a USB stick when a church has no usable wifi at all. |

*Accept ST2.1:* a sync after one song's lyrics changed transfers that song, and not the library.

*Accept ST2.7:* with the sync endpoint artificially held open for sixty seconds, slide advance latency
is unchanged, measured against the ST20.1 budget.

*Accept ST2.10:* a laptop synced on Thursday, then put in a cupboard with no network, runs Sunday's
full service including backgrounds and scripture text.

---

## 7. Domain 3. The deck: plan, songs, and cues

The deck is the service, compiled. This is the part no other presenter has.

| ID | Rel | Requirement |
|---|---|---|
| ST3.1 | S0.2 | **A service plan opens as a deck.** Plan items in order become cue groups, in the order Maria and James put them in. No building step. |
| ST3.2 | S0.1 | A song item compiles to slides by resolving its arrangement's sequence (R12.5) against the song's labelled sections (R12.4). A sequence of `V1 C V2 C B C C` produces exactly those sections in that order, with repeats as separate cues. |
| ST3.3 | S0.2 | A scripture item compiles to slides from the resolved text the platform already stored (R11.5), with no lookup and no internet. |
| ST3.4 | S0.2 | Non-presenting plan items, sermon, prayer, offering, announcements, appear in the deck as markers, so the operator's position in the deck matches the service's position in the room. |
| ST3.5 | S0.2 | **Plan notes are visible to the operator**, including the note addressed to their position (R11.6), on the control surface and on the stage display. |
| ST3.6 | S0.2 | The deck shows the arrangement's key and tempo, because that is what James will be asked from the platform. |
| ST3.7 | S0.1 | **Reordering a cue during a service is local and temporary.** It affects this run, and never writes back to the plan. |
| ST3.8 | S0.2 | Add a song to the live deck from the cached library by typing, in under five seconds, because the leader calls one that is not in the plan. |
| ST3.9 | S0.3 | Skip, repeat, and jump to any cue by label, so `C2` is reachable by typing it. |
| ST3.10 | S0.3 | A blank deck: Stage opens with no plan and still presents a song, a scripture, and a countdown. A church that does not plan in Hearth yet is not locked out. |
| ST3.11 | S0.3 | **The plan changed while we were live.** An updated plan arrives as an offer, named and dismissible, and never rewrites the deck under the operator's hands. |
| ST3.12 | S0.4 | Deck snapshot: the run as it actually happened, kept locally, so an operator can reopen the second service exactly as the first one went. |

*Accept ST3.2:* a fixture set of fifty arrangements compiles to decks matching golden expected output,
including sequences with repeated labels, a label appearing once, and a sequence referencing a missing
label, which fails loudly at compile time rather than silently at service time.

*Accept ST3.11:* with a plan change arriving mid-song, the live slide does not move, and the offer
waits.

---

## 8. Domain 4. Lyric rendering

Words on a wall, done properly. The bar is the back row of a dark room.

| ID | Rel | Requirement |
|---|---|---|
| ST4.1 | S0.1 | **One section is one or more slides**, split on line count against the theme's limit, never mid-line and never mid-word. |
| ST4.2 | S0.1 | Text fits the safe area by measurement, not by guesswork. A long line reduces the slide's size, and all slides in a section share one size so the words do not jump between them. |
| ST4.3 | S0.1 | Section label and type are available to the renderer, so a theme can show `V1` on the confidence monitor and never on the wall. |
| ST4.4 | S0.1 | A slide never overflows, never clips a descender, and never shows a scrollbar. This is verified by an automated render test, not by eye. |
| ST4.5 | S0.1 | Transition between slides is a cross-dissolve at a theme-set duration, defaulting to 200ms, GPU composited, with no flash of background. |
| ST4.6 | S0.1 | **Black, clear, and logo** are each one keypress, independent of the deck position, and returning from them restores the exact slide. |
| ST4.7 | S0.3 | Per-slide override of size, alignment, and background, stored against this run, not against the song. |
| ST4.8 | S0.3 | A slide is editable live for a typo, and the edit offers to be sent back to the platform as a suggestion rather than written silently. |
| ST4.9 | S1.0 | Two languages on one slide, primary and translation, from the section-aligned translations in R12.8, with independent sizing. |
| ST4.10 | S1.0 | Right-to-left text, vertical centring, and a font fallback chain that covers the scripts a church actually uses. |

*Accept ST4.2:* a section with one two-word line and one eighteen-word line renders both at the same
size, that size fits inside the safe area, and the longer line wraps to at most the theme's line limit.

*Accept ST4.4:* a render harness rasterises every slide in a 200-song fixture library at three output
resolutions and asserts no glyph crosses the safe area boundary.

---

## 9. Domain 5. Scripture

| ID | Rel | Requirement |
|---|---|---|
| ST5.1 | S0.2 | Render a scripture plan item from the reference, translation, and resolved text the platform holds. |
| ST5.2 | S0.2 | **Automatic verse splitting** across slides, breaking at verse boundaries, keeping the reference visible on every slide of the passage. |
| ST5.3 | S0.2 | Verse numbers shown or hidden by theme setting. |
| ST5.4 | S0.3 | Add a passage live by typing a reference, resolved from the cache, which means a church's chosen translations are synced ahead of Sunday rather than fetched in the moment. |
| ST5.5 | S0.3 | Two translations side by side for the same passage. |
| ST5.6 | S1.0 | Caption output of the spoken reference, feeding ST15.3. |

*Accept ST5.2:* a nine-verse passage splits at verse boundaries across the fewest slides that fit the
theme, every slide carries the reference, and no verse is split across two slides unless the verse
alone exceeds one slide, in which case it breaks at a sentence.

---

## 10. Domain 6. Themes and templates

| ID | Rel | Requirement |
|---|---|---|
| ST6.1 | S0.1 | One built-in theme that is good enough to use unmodified on a Sunday. Typography, contrast, and safe areas from the platform's design system. |
| ST6.2 | S0.1 | A theme is data: font family, weights, sizes as a proportion of output height, colour, alignment, safe area insets, line limit, shadow or outline for legibility over video, and transition duration. |
| ST6.3 | S0.2 | Themes sync from the platform, so the church sets its look once and every laptop matches. |
| ST6.4 | S0.3 | Separate themes per content kind: lyrics, scripture, announcement, title. A church sets four looks, not forty. |
| ST6.5 | S0.3 | A theme is previewed at the real output resolution before it is used. |
| ST6.6 | S1.0 | Theme editing inside Stage, with a live preview and a contrast check that refuses to save a lyric theme below the station contrast floor of 7:1. |
| ST6.7 | S1.0 | Templates: a theme plus a background plus an overlay, saved as one named thing a church picks by name. |
| ST6.8 | S1.0 | Import a font the church owns, with the licence responsibility stated at the moment of import. |

*Accept ST6.1:* the default theme passes a 7:1 contrast measurement over its own default background
and over the four bundled video loops, measured on the rendered frame rather than on the token values.

---

## 11. Domain 7. Backgrounds and media

| ID | Rel | Requirement |
|---|---|---|
| ST7.1 | S0.1 | Solid colour and gradient backgrounds from the theme. |
| ST7.2 | S0.3 | Still image backgrounds from the operator's disk, scaled and cropped to the output without distortion. |
| ST7.3 | S0.3 | **Video loop backgrounds**, seamlessly looping, hardware decoded, holding frame rate at 1080p while text composites over them. |
| ST7.4 | S0.3 | A handful of bundled loops that look like the church's room rather than a stock video site, licensed for redistribution under AGPL terms. |
| ST7.5 | S0.3 | A background is assigned per theme, per plan item, or per slide, and the most specific assignment wins. |
| ST7.6 | S0.4 | Audio and video as plan items in their own right, with duration, in and out points, and an end-of-item behaviour. |
| ST7.7 | S0.4 | Audio ducking is out of scope. Stage sets output device and level, and the sound desk owns the rest. |
| ST7.8 | S1.0 | Live camera input as a background layer, with device selection and a frozen fallback if the device disappears. |
| ST7.9 | S0.3 | A media file that is missing, corrupt, or in an undecodable codec fails to the theme colour and says so on the control surface, never on the output. |

*Accept ST7.3:* a 30 second 1080p H.264 loop plays for three hours with no visible seam at the loop
point, no drift in memory use, and no dropped frames during a slide dissolve, on the ST20.5 reference
hardware.

*Accept ST7.9:* deleting a background file while it is on screen leaves the service running.

---

## 12. Domain 8. Outputs and screen mapping

| ID | Rel | Requirement |
|---|---|---|
| ST8.1 | S0.1 | One output window, fullscreen on a chosen display, with the display picked by name and position rather than by index. |
| ST8.2 | S0.1 | The output window carries no chrome, no cursor, and no operating system notification, and it does not sleep. |
| ST8.3 | S0.3 | **Multiple outputs, independent content per output.** The main screen shows lyrics while the foyer screen shows the announcement loop. |
| ST8.4 | S0.3 | Output configuration survives a display being unplugged and replugged, matched by display identity, so the Sunday projector always lands on the same output. |
| ST8.5 | S0.3 | A display disappearing mid-service does not take Stage down, and the output reappears on reconnection with the live slide. |
| ST8.6 | S0.3 | Output resolution, scaling, and aspect handled explicitly, with letterboxing by choice rather than by accident. |
| ST8.7 | S0.3 | A test pattern per output, showing safe areas, resolution, and a contrast ramp, because that is how an operator finds out the projector is clipping the edges before the service. |
| ST8.8 | S0.4 | Output groups: name a set of outputs and address them together. |
| ST8.9 | S1.0 | Alpha-keyed output for the livestream, carried in ST14.x. |

*Accept ST8.4:* unplugging the projector, restarting Stage, and plugging it back in restores the same
output to the same display with no reconfiguration.

---

## 13. Domain 9. Stage display and confidence monitor

The screen facing the platform. It is why the product is called Stage.

| ID | Rel | Requirement |
|---|---|---|
| ST9.1 | S0.3 | **Current slide, next slide, clock, and timer** on one screen, legible from twenty feet. |
| ST9.2 | S0.3 | The plan note addressed to this position, and the global note, shown here (R11.6). |
| ST9.3 | S0.3 | Section label and the remaining sequence, so the leader knows a second chorus is coming. |
| ST9.4 | S0.3 | Chords over lyrics on the stage display, transposed to the arrangement's key by the same `packages/songs` code the printed chart uses (R12.6). |
| ST9.5 | S0.3 | The stage display is one of the outputs in ST8.3, configured the same way. |
| ST9.6 | S0.3 | Layout presets: lyrics and chords for the band, text and timer for the preacher, slide thumbnail and notes for the host. |
| ST9.7 | S0.4 | A message sent to the stage display from the control surface or the remote, which is how a service producer tells the preacher to wrap up. |
| ST9.8 | S0.4 | Timers on the stage display can run independently of the service clock, counting down a sermon's planned duration from the plan (R11.3). |

*Accept ST9.4:* a chart in G displayed in B flat matches the transposition the platform's printed chart
produces for the same arrangement, byte for byte on the chord symbols, verified against the same
fifty-chart fixture set as R12.6.

---

## 14. Domain 10. Live operation and control

The operator is sixteen and untrained. This domain is where that is either respected or ignored.

| ID | Rel | Requirement |
|---|---|---|
| ST10.1 | S0.1 | **Fully keyboard operable.** Next, previous, black, clear, logo, jump, and search, with no pointer. |
| ST10.2 | S0.1 | The control surface shows the live slide, the next slide, and the deck, and the live slide is unambiguous at a glance. |
| ST10.3 | S0.1 | **Nothing destructive is reachable during a service.** No delete, no library edit, no theme edit, in the live surface. |
| ST10.4 | S0.1 | Advance is idempotent under key repeat: holding the key does not skip four cues. |
| ST10.5 | S0.2 | A service is chosen at launch from the synced services, defaulting to the next one by date and time, so the common case is one keypress. |
| ST10.6 | S0.3 | The operator can see at all times: what is live, what is next, whether the output is black, whether sync is current, and what time it is. |
| ST10.7 | S0.3 | A confirm step on anything that interrupts the service, sized so it cannot be dismissed by the same key that advances a slide. |
| ST10.8 | S0.4 | Hotkey customisation, with the defaults printable on one side of a card. |
| ST10.9 | S0.4 | Macros: one trigger firing several actions, for example black the main output, show the lower third, start the timer. |
| ST10.10 | S0.3 | **Operator brief**: a one-screen card inside Stage that says what the four keys do. It is what the sixteen year old reads at 10:28. |

*Accept ST10.1:* a full service is run with the trackpad physically disconnected.

*Accept ST10.4:* holding the advance key for two seconds advances by one cue per keypress event with
no repeat acceleration, and the test asserts the cue index.

---

## 15. Domain 11. Timers, clocks, and loops

| ID | Rel | Requirement |
|---|---|---|
| ST11.1 | S0.3 | **Countdown to a time of day**, which is what a pre-service countdown actually is, surviving a restart because it is anchored to the clock rather than to a duration. |
| ST11.2 | S0.3 | Countdown of a duration, with start, pause, reset, and an end behaviour. |
| ST11.3 | S0.3 | A clock output for the stage display and the foyer. |
| ST11.4 | S0.3 | **Announcement loop**: the church's announcements from the platform, rotating with a dwell time, on any output, running while the main output does something else. |
| ST11.5 | S0.3 | The loop is built from plan items and platform announcements, which means Maria's Thursday typing reaches the foyer screen with nobody rebuilding it. |
| ST11.6 | S0.4 | A loop item can be a still, a video, or a slide, mixed in one rotation. |
| ST11.7 | S0.3 | The countdown reaching zero does not auto-start the service. A human starts the service. |

*Accept ST11.1:* a countdown to 10:30 restarted at 10:27 resumes showing three minutes, having been
told nothing.

*Accept ST11.5:* an announcement added in Hearth appears in the next pre-service loop with no action
in Stage beyond a sync.

---

## 16. Domain 12. Remote control

| ID | Rel | Requirement |
|---|---|---|
| ST12.1 | S0.4 | **Control from a phone or tablet on the local network**, in a browser, with no app install. |
| ST12.2 | S0.4 | Pairing by a code shown on the control surface, over the local network only, never through our servers. |
| ST12.3 | S0.4 | Remote shows live slide, next slide, the deck, and the plan notes, and advances, reverses, blacks, and jumps. |
| ST12.4 | S0.4 | Two controllers at once stay consistent: the leader on stage and the operator at the desk see the same live cue. |
| ST12.5 | S0.4 | The remote is `portal` density from the design system, usable one handed, with targets a guitarist can hit without looking. |
| ST12.6 | S0.4 | Losing the remote's wifi does not affect the laptop's control, and the remote reconnects to current state. |
| ST12.7 | S1.0 | A view-only remote for the preacher and the host, showing notes and the timer with no control. |

*Accept ST12.4:* with two remotes and the laptop all open, advancing from any one of them moves all
three within 300ms on a congested church wifi.

---

## 17. Domain 13. Integrations and triggers

| ID | Rel | Requirement |
|---|---|---|
| ST13.1 | S0.4 | Stream Deck support, as a plugin or as keyboard emulation, with cue, black, and macro buttons. |
| ST13.2 | S0.4 | MIDI in and out, for triggers from a keyboard or a show controller. |
| ST13.3 | S0.4 | OSC in and out, documented, with every address listed. |
| ST13.4 | S0.4 | An outbound trigger on cue change, so a lighting desk or a switcher can follow Stage. |
| ST13.5 | S1.0 | A documented local HTTP control API, which is also what the remote uses, so a church that wants to script Stage can. |
| ST13.6 | S0.4 | Every integration is off by default, and none of them is required for a service. |

*Accept ST13.6:* a clean install with no integration configured runs a full service, and no
integration failure can block a cue advance.

---

## 18. Domain 14. Broadcast output

| ID | Rel | Requirement |
|---|---|---|
| ST14.1 | S1.0 | **NDI output** per output group, so OBS and the switcher receive Stage without a capture card. |
| ST14.2 | S1.0 | **Alpha-keyed output**, lyrics and lower thirds over transparency, which is the thing every streaming church asks for and no free presenter does well. |
| ST14.3 | S1.0 | A separate theme for the keyed output, because lyrics sized for a projector are wrong over camera. |
| ST14.4 | S1.0 | Lower-third mode: a reduced-height region with its own content, independent of the main slide. |
| ST14.5 | S1.0 | NDI failing to initialise degrades to no NDI, and never prevents Stage starting. |

*Accept ST14.2:* a keyed NDI source composited over camera in OBS shows antialiased text edges with no
dark fringe, verified on a frame capture.

---

## 19. Domain 15. Multi-language and captions

| ID | Rel | Requirement |
|---|---|---|
| ST15.1 | S1.0 | Bilingual lyric slides from the section-aligned translations in R12.8, rendered as a join rather than as a second song. |
| ST15.2 | S1.0 | A second output carrying a different language from the main output, for a congregation that splits. |
| ST15.3 | S1.0 | Caption output of the current slide's text, as an NDI or local HTTP stream, for the livestream's caption track. |
| ST15.4 | S1.0 | Stage's own interface is translated from `packages/i18n`, the same catalogue as the platform, with every string externalised from Stage's first commit. |

*Accept ST15.1:* a song with English and Spanish sections renders both on one slide, section aligned,
with neither language overflowing, and a section missing a translation renders the primary alone
rather than an empty half.

---

## 20. Domain 16. Import and migration

The library a church already has is the reason it cannot leave its current presenter.

| ID | Rel | Requirement |
|---|---|---|
| ST16.1 | S1.0 | Import song libraries from ProPresenter, EasyWorship, OpenLP, OpenSong, and OpenLyrics, **into the platform library** rather than into Stage, because the platform is where songs live. |
| ST16.2 | S1.0 | Section types and labels survive the import, because that is the whole point. Where the source has no section structure, the import says which songs came in unstructured and offers them for review. |
| ST16.3 | S1.0 | PowerPoint and Keynote decks import as a plan item of ordered slides, with no pretence of becoming songs. |
| ST16.4 | S1.0 | Import is a dry run with a report before it writes, and is reversible for thirty days, the same contract as the platform's importers (R19.3, R19.4). |
| ST16.5 | S1.0 | Media referenced by an imported library is matched, listed if missing, and never silently dropped. |

*Accept ST16.2:* a 300 song ProPresenter 7 library imports with section labels intact on every song
that had them, and the report names every song that did not.

**Note on ownership.** ST16.1 is the Stage-facing description of platform requirement R20.10. The
importers run on the platform, because that is where the library and the rollback already are. Stage's
part is the file reading and the structural mapping, which lives in a shared package.

---

## 21. Domain 17. Reporting back to the platform

| ID | Rel | Requirement |
|---|---|---|
| ST17.1 | S0.2 | **Song usage pushed back** as `SongUsage` rows with song, arrangement, key used, service, and date, with `source = stage` (PRD section 9.4). |
| ST17.2 | S0.2 | Usage is recorded when a song is actually shown, not when a plan is opened, so the CCLI report reflects the service rather than the intention. |
| ST17.3 | S0.2 | Usage queued offline is pushed on reconnect, idempotently, and a double push does not double count. |
| ST17.4 | S0.3 | A song added live in Stage and not in the plan is still reported, because that is exactly the usage a church forgets to report and gets fined for. |
| ST17.5 | S0.4 | Service run telemetry back to the platform for the plan's revision history: what ran, in what order, and how long each item actually took, against R11.3's planned durations. |
| ST17.6 | S0.2 | No other data leaves Stage. No analytics on what a church sings, no model training, carried from the platform's trust constraints. |

*Accept ST17.1:* a service run in Stage with the network off appears in the platform's CCLI usage
export for the period after the laptop reconnects, with the correct key.

---

## 22. Domain 18. Reliability, recovery, and updates

| ID | Rel | Requirement |
|---|---|---|
| ST18.1 | S0.3 | **Crash recovery to the live slide in under five seconds**, including output configuration and timer state. |
| ST18.2 | S0.3 | The live cue pointer is persisted on every change, so recovery needs no guessing. |
| ST18.3 | S0.3 | A renderer process crashing takes out one output, which is restarted automatically, and leaves the others running. |
| ST18.4 | S0.3 | Stage starts with a corrupt cache by rebuilding it, and says a resync is needed, rather than refusing to open. |
| ST18.5 | S0.3 | Stage starts with no network, an expired token, and a stale cache, and runs the service it has. **This is the primary failure case and it is tested every release.** |
| ST18.6 | S1.0 | Auto-update that downloads in the background, applies on the operator's say-so, and **never prompts or applies inside a Sunday window**, matching the platform's deploy rule (N5). |
| ST18.7 | S1.0 | The previous version is kept and rolled back to from inside Stage, because an update that breaks Sunday has to be undoable by a volunteer. |
| ST18.8 | S0.3 | A local diagnostic log the operator can send, scrubbed of lyrics, names, and the device token. |
| ST18.9 | S1.0 | Signed and notarised builds for macOS, signed for Windows, AppImage and deb for Linux. An unsigned build is not shipped to a church. |

*Accept ST18.1:* `kill -9` during a live song, then relaunch, shows the same slide on the same output
inside five seconds, measured ten times.

*Accept ST18.5:* a laptop with the wifi password changed, the token revoked, and a cache from last
Sunday runs this Sunday's cached service to the end.

---

## 23. Domain 19. Accessibility and legibility

Two different jobs. The control surface is a user interface. The output is a sign read from the back
of a dark room.

| ID | Rel | Requirement |
|---|---|---|
| ST19.1 | S0.1 | The control surface meets WCAG 2.2 AA, audited in CI, the same bar as the platform (R22.7). |
| ST19.2 | S0.1 | Full keyboard operation with a visible focus ring that is never removed, carried from the design system. |
| ST19.3 | S0.3 | The control surface works at `office` density, and the stage display and remote at the station and portal densities, with no fourth density mode invented for Stage. |
| ST19.4 | S0.1 | **Output legibility floor:** lyric cap height at or above 4% of output height, body weight at or above 400, and measured contrast at or above 7:1 against the rendered background. A theme below the floor cannot be saved. |
| ST19.5 | S0.3 | Motion respects the operating system's reduced motion setting on the control surface. The output's dissolve is content rather than decoration, and is set by the theme. |
| ST19.6 | S1.0 | Caption output (ST15.3) is the accessibility answer for the congregation, and is documented as such. |

*Accept ST19.4:* an automated audit rasterises the default theme over every bundled background and
fails the build if any sampled text region falls below 7:1.

---

## 24. Domain 20. Non-functional requirements

| ID | Requirement |
|---|---|
| ST20.1 | **Slide advance under 100ms** from key event to pixels changed on the output, measured with a frame capture, at the 99th percentile. |
| ST20.2 | **Cold start to the first slide of the next service in under ten seconds** on the reference hardware. |
| ST20.3 | Runs indefinitely with no network after one successful sync. No feature degrades except sync itself. |
| ST20.4 | Crash recovery inside five seconds (ST18.1). |
| ST20.5 | **Reference hardware is a 2019 laptop**: four cores, 8GB, integrated graphics, 1080p output. That is what is on the church's media desk. Performance is measured there rather than on a developer's machine. |
| ST20.6 | 1080p60 output with a video background and a text dissolve, with no dropped frames, on reference hardware. |
| ST20.7 | No memory growth across a three-hour session with video backgrounds, asserted by a soak test. |
| ST20.8 | **No network call in the render path.** Enforced by an architectural test, not by discipline. |
| ST20.9 | Every user-facing string externalised into `packages/i18n` from Stage's first commit (R22.8). |
| ST20.10 | A library of 2,000 songs and 500 plans in the local cache with search under 100ms. |
| ST20.11 | Installer under 150MB per platform, and Stage's disk use visible and bounded (ST2.11). |
| ST20.12 | Stage contains no telemetry beyond ST17.x, and no crash reporting that transmits without the operator's action. |

---

## 25. Traceability to PRD.md section 8.23

Every outline item, and where it is delivered.

| Outline | Subject | Delivered by | Release |
|---|---|---|---|
| S1 | Sync and cache, then run with no network | ST2.1 to ST2.13, ST18.5 | S0.2 |
| S2 | Render from R12.4 sections following the R12.5 sequence | ST3.2, ST4.1 to ST4.6 | S0.1 |
| S3 | Themes, templates, styling, safe areas, per-slide overrides | ST6.x, ST4.7 | S0.1 to S1.0 |
| S4 | Backgrounds: still, video loop, live camera | ST7.2, ST7.3, ST7.8 | S0.3, S1.0 |
| S5 | Scripture slides, translations, verse splitting | ST5.x | S0.2 |
| S6 | Announcement loops and pre-service rotations | ST11.4 to ST11.6 | S0.3 |
| S7 | Countdown timers and clocks | ST11.1 to ST11.3 | S0.3 |
| S8 | Stage display and confidence monitor | ST9.x | S0.3 |
| S9 | Multi-screen output mapping, independent content | ST8.3 to ST8.8 | S0.3 |
| S10 | NDI and alpha-keyed output | ST14.x | S1.0 |
| S11 | Audio and video playback as plan items | ST7.6, ST7.7 | S0.4 |
| S12 | Props and overlays, independent of the slide | ST14.4, ST8.8 | S0.4, S1.0 |
| S13 | Hotkeys, macros, MIDI, OSC, Stream Deck | ST10.8, ST10.9, ST13.x | S0.4 |
| S14 | Remote control from a phone or tablet | ST12.x | S0.4 |
| S15 | Bilingual output and captions | ST15.x | S1.0 |
| S16 | Import from the five presenters | ST16.x, platform R20.10 | S1.0 |
| S17 | Report song usage back to the platform | ST17.x | S0.2 |
| S18 | Crash recovery within five seconds | ST18.1 to ST18.3 | S0.3 |

---

## 26. What Phase 1 owes Stage, and what Stage owes Phase 1

Phase 1 owes two things, both in platform release 0.4, both already specified.

1. **The song schema** (R12.1 to R12.7, R12.9, PRD section 9.4). Sections ordered and labelled,
   sequences as data, translations section aligned.
2. **The sync contract** (R11.14, R12.13, PRD section 9.6). Specified in full in
   [docs/stage-sync-contract.md](docs/stage-sync-contract.md).

Stage owes Phase 1 the usage rows that make the CCLI export honest, and nothing else.

**Nothing in this document may change Phase 1 scope.** If building Stage reveals that the contract
needs a field, that is a change to the contract document, raised as a platform story with a
requirement ID, and taken through the platform board. It is never a quiet addition.

---

## 27. Risks

| Risk | Severity | Response |
|---|---|---|
| Stage ships before platform 0.4 and has nothing to sync | High | S0.1 runs entirely on fixtures, and the fixtures are generated from the contract's own schema. The dependency lands at S0.2 and is stated on the board. |
| Electron performance on the reference hardware | High | ST20.5 names the hardware, and ST20.1 and ST20.6 are measured budgets with tests from S0.1. A render path that misses them is a defect rather than a tuning exercise. |
| Video and codec reality across three operating systems | Medium | Hardware decode is per platform and will differ. ST7.9 means failure degrades to a colour, so a codec problem is cosmetic rather than fatal. |
| Scope creep from the production volunteer | Medium | The non-goals in section 3 are settled. NDI and alpha key are in, mixing and lighting are out. |
| An operator breaking a service by pressing the wrong key | High | ST10.3 and ST10.7. The live surface has nothing destructive in it. |
| Themes becoming a design tool | Medium | Four content kinds, one good default, a contrast floor that refuses bad themes. A church that wants a design tool has one already. |
| Building a second song database by accident | High | ST2.4. Stage is read-only on everything it pulls, and the cache is disposable. |
| Two windows of work colliding in one repository | Medium | File ownership is stated in [BACKLOG-STAGE.md](BACKLOG-STAGE.md). Stage owns `apps/stage` and `packages/songs`. The platform owns `packages/db` and `apps/web`. |

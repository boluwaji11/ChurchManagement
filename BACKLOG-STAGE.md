# Backlog, Hearth Stage

The Stage board. Separate from [BACKLOG.md](BACKLOG.md) so the platform and the presenter can be
built in parallel without two people editing one table.

Requirement IDs (`ST3.2`, `ST18.1`) point at [PRD-STAGE.md](PRD-STAGE.md) and say **what** to build.
Work item IDs (`STG-14`) say **when** it is being built and whether it is finished.

## How this works

Same four levels, same states, and the same rules as the platform board.

| Level | Meaning | ID |
|---|---|---|
| **Epic** | A Stage release. Defined by what a church can do on a Sunday with it. | `SE1` to `SE5` |
| **Feature** | A PRD-STAGE domain inside that release. | `SF1` to `SF20` |
| **Story** | One deliverable. Built, then tested, then closed. | `STG-n` |
| **Task** | Steps inside a story. In the story's checklist. | |

### States

**New**, **Active**, **Resolved**, **Closed**, **Blocked**, **Deferred**. Meanings as on the platform
board. **Resolved is not Closed.** A story sits in Resolved until Boluwaji has used it by hand.

### Rules

1. **One story Active at a time on this board.** The platform board has its own Active story, and the
   two do not count against each other.
2. **Every story names what to test.**
3. **Commits reference the story**, in the footer: `Work item: STG-14`.
4. **Nothing is built that has no story.**
5. **The board is updated in the same commit as the work.**
6. **A Stage story never changes platform scope.** Where Stage needs something from the platform, it
   becomes a row in the dependency table at the bottom of this file and a story on the platform
   board, with a requirement ID.

## File ownership, so two windows do not collide

| Owned by Stage | Owned by the platform |
|---|---|
| `apps/stage/**` | `apps/web/**` |
| `packages/songs/**` | `packages/db/**` |
| `packages/stage-protocol/**` | `packages/i18n/src/**` catalogue entries for web screens |
| `PRD-STAGE.md`, `BACKLOG-STAGE.md` | `PRD.md`, `BACKLOG.md`, `ROADMAP.md` |
| `docs/stage-architecture.md`, `docs/stage-sync-contract.md` | `docs/architecture.md`, `docs/data-model.md`, `docs/design-system.md` |

Shared, and touched with care: `pnpm-workspace.yaml`, `turbo.json`, root `package.json`,
`packages/ui/**` (read by Stage, changed by the platform), `packages/i18n` catalogue (Stage adds its
own namespace rather than editing web keys).

`packages/songs` is owned here because Stage is its only consumer until the platform's music stand
view (R11.13) arrives in platform 1.0. The platform's song library screens in 0.4 import from it
without changing it. Any change the platform needs is a row in the dependency table.

---

## SE1. The slide (S0.1)

Fixture data, with sync and the platform dependency still ahead. The release that proves the render is good enough
before anything is wired to a database. Exit criteria in [PRD-STAGE.md section 4](PRD-STAGE.md).

### SF0. The shared song domain

| ID | Story | Req | State |
|---|---|---|---|
| STG-1 | Scaffold `packages/songs` with the song, section, arrangement and usage types from PRD section 9.4, and no runtime dependencies | ST3.2 | New |
| STG-2 | Resolve an arrangement sequence into an ordered list of sections, failing loudly on a missing label | ST3.2 | New |
| STG-3 | Parse ChordPro and transpose to any key, verified against the fifty-chart fixture set | ST9.4, R12.6 | New |
| STG-4 | Split a section into slides on the theme's line limit, breaking between lines | ST4.1 | New |
| STG-5 | Compile a plan into a deck of cue groups, deterministically, with golden fixtures | ST3.2, ST3.4 | New |
| STG-6 | Generate the fixture library from the sync contract's own payload schema, so fixtures cannot drift from the real shape | ST3.2 | New |

### SF1. The Electron shell

| ID | Story | Req | State |
|---|---|---|---|
| STG-7 | Scaffold `apps/stage`: Electron, sandboxed renderers, context isolation, CSP, a preload channel allowlist | ST20.8 | New |
| STG-8 | Define `packages/stage-protocol`: `OutputState` down, intents up, typed both ways | ST18.1 | New |
| STG-9 | Wire `packages/i18n` into Stage with its own namespace, and a test that fails the build on copy written inline | ST20.9, R22.8 | New |
| STG-10 | Open an output window fullscreen on a display chosen by identity, with the cursor hidden and the display kept awake | ST8.1, ST8.2 | New |

### SF4. Lyric rendering

| ID | Story | Req | State |
|---|---|---|---|
| STG-11 | Define a theme as data, and ship one built-in theme good enough to use unmodified | ST6.1, ST6.2 | New |
| STG-12 | Render a lyric slide inside the theme's safe area | ST4.1, ST4.3 | New |
| STG-13 | Fit text by measurement, one size per section, cached by text, theme and resolution | ST4.2 | New |
| STG-14 | Cross-dissolve between slides on two GPU layers, with no flash of background | ST4.5 | New |

### SF10. Live operation

| ID | Story | Req | State |
|---|---|---|---|
| STG-15 | Build the control surface: live slide, next slide, the deck, keyboard only | ST10.1, ST10.2 | New |
| STG-16 | Make black, clear and logo each one keypress, restoring the exact slide | ST4.6 | New |
| STG-17 | Make advance idempotent under key repeat | ST10.4 | New |
| STG-18 | Reorder, skip and repeat a cue for this run, leaving the plan untouched | ST3.7, ST3.9 | New |
| STG-19 | Write the operator brief: one screen inside Stage saying what the four keys do | ST10.10 | New |

### SF19. The measurements

| ID | Story | Req | State |
|---|---|---|---|
| STG-20 | Build the render harness: rasterise every slide in the fixture library at three resolutions, assert safe area and 7:1 contrast | ST4.4, ST19.4 | New |
| STG-21 | Measure advance latency by frame capture and record it per release, on reference hardware | ST20.1, ST20.5 | New |
| STG-22 | Audit the control surface to WCAG 2.2 AA in CI, the same bar as the platform | ST19.1, ST19.2 | New |
| STG-23 | Add the architecture test that fails the build if the render path can reach the network | ST20.8 | New |

---

## SE2. The plan (S0.2)

**Blocked until platform 0.4 ships the song library and the sync API.** The dependency table at the
bottom of this file names exactly what is owed. This is the release that justifies the product.

### SF1. Device and identity

| ID | Story | Req | State |
|---|---|---|---|
| STG-24 | Pair a device with a six character code, and store the token in the keychain | ST1.1 to ST1.3, ST1.7 | New |
| STG-25 | Handle a revoked or invalid token by saying so and continuing to serve the cache | ST1.5 | New |
| STG-26 | Name the device, and show the name in the platform's device list | ST1.8 | New |

### SF2. Sync and the cache

| ID | Story | Req | State |
|---|---|---|---|
| STG-27 | Build the local store: `cache.db`, `local.db`, and the content-addressed media directory | ST2.3 | New |
| STG-28 | Sync by cursor, one transaction per page writing rows and advancing the cursor together | ST2.1, ST2.4 | New |
| STG-29 | Fetch song and plan bodies, whole, with sections and arrangements nested | ST2.2 | New |
| STG-30 | Fetch media by content hash, resumable and verified, degrading to the theme colour when missing | ST2.9, ST7.9 | New |
| STG-31 | Run sync on a worker thread, and prove it cannot delay a cue advance | ST2.7 | New |
| STG-32 | Show the last successful sync, and say plainly when the plan on screen is older than the server's | ST2.8 | New |
| STG-33 | Prefetch seven days of services, so Sunday needs no network at all | ST2.10 | New |

### SF3. The deck from a real plan

| ID | Story | Req | State |
|---|---|---|---|
| STG-34 | Open a service chosen from the synced list, defaulting to the next one by date | ST10.5, ST3.1 | New |
| STG-35 | Show non-presenting plan items as deck markers, so the operator's position matches the room's | ST3.4 | New |
| STG-36 | Show plan notes, global and addressed to a position, on the control surface | ST3.5 | New |
| STG-37 | Show the arrangement key and tempo, and honour the plan item's key override | ST3.6 | New |
| STG-38 | Add a song to the live deck from the cached library by typing, in under five seconds | ST3.8 | New |
| STG-39 | Offer an updated plan as a dismissible offer that never rewrites the live deck | ST3.11 | New |

### SF5. Scripture

| ID | Story | Req | State |
|---|---|---|---|
| STG-40 | Render a scripture item from the platform's resolved text | ST5.1 | New |
| STG-41 | Split a passage at verse boundaries, with the reference on every slide | ST5.2, ST5.3 | New |

### SF17. Reporting back

| ID | Story | Req | State |
|---|---|---|---|
| STG-42 | Record usage when a song is actually shown, queue it durably, and push it idempotently | ST17.1 to ST17.3 | New |
| STG-43 | Report a song added live and absent from the plan, which is the usage churches get fined for | ST17.4 | New |

### SF18. The failure case

| ID | Story | Req | State |
|---|---|---|---|
| STG-44 | Build the fault injection suite: no network, held-open connections, 500s, a revoked token, an invalid cursor, a corrupt cache | ST18.5, ST2.7 | New |
| STG-45 | Run a full cached service with the wifi password changed and the token revoked, every release | ST18.5 | New |

---

## SE3. The room (S0.3)

What makes Stage usable as a church's only presenter. Exit criteria: four consecutive Sundays with
ProPresenter uninstalled.

### SF9. Stage display

| ID | Story | Req | State |
|---|---|---|---|
| STG-46 | Build the stage display: current slide, next slide, clock, timer, legible from twenty feet | ST9.1 | New |
| STG-47 | Show the position's plan note and the remaining sequence on the stage display | ST9.2, ST9.3 | New |
| STG-48 | Show chords over lyrics, transposed by the same code the printed chart uses | ST9.4 | New |
| STG-49 | Ship three stage display presets: band, preacher, host | ST9.6 | New |

### SF8. Outputs

| ID | Story | Req | State |
|---|---|---|---|
| STG-50 | Drive several outputs with independent content per output | ST8.3, ST9.5 | New |
| STG-51 | Keep output configuration across a display unplugged, replugged, and a restart | ST8.4, ST8.5 | New |
| STG-52 | Handle resolution, scaling and aspect explicitly, with letterboxing by choice | ST8.6 | New |
| STG-53 | Add a test pattern per output showing safe areas, resolution and a contrast ramp | ST8.7 | New |

### SF7. Backgrounds

| ID | Story | Req | State |
|---|---|---|---|
| STG-54 | Show a still image background, scaled and cropped without distortion | ST7.2 | New |
| STG-55 | Play a seamless hardware-decoded video loop with text composited over it | ST7.3 | New |
| STG-56 | Bundle a small set of loops that look like a church room, licensed for redistribution | ST7.4 | New |
| STG-57 | Resolve background assignment by precedence: theme, then plan item, then slide | ST7.5 | New |
| STG-58 | Override size, alignment and background on one slide, for this run only | ST4.7 | New |

### SF11. Timers and loops

| ID | Story | Req | State |
|---|---|---|---|
| STG-59 | Count down to a time of day, anchored to the clock so a restart resumes correctly | ST11.1, ST11.7 | New |
| STG-60 | Count down a duration, and output a clock | ST11.2, ST11.3 | New |
| STG-61 | Run the pre-service announcement loop from the platform's announcements, on any output | ST11.4, ST11.5 | New |

### SF18. Recovery

| ID | Story | Req | State |
|---|---|---|---|
| STG-62 | Persist the live cue pointer on every change and recover to it in under five seconds | ST18.1, ST18.2 | New |
| STG-63 | Restart a crashed output renderer without touching the other outputs | ST18.3 | New |
| STG-64 | Rebuild a corrupt cache on start, keeping the unpushed usage queue | ST18.4 | New |
| STG-65 | Write a diagnostic log the operator can send, scrubbed of lyrics, names and the token | ST18.8 | New |

### SF6. Themes, and the rest of the room

| ID | Story | Req | State |
|---|---|---|---|
| STG-66 | Sync themes from the platform, with separate themes per content kind | ST6.3, ST6.4 | New |
| STG-67 | Preview a theme at the real output resolution | ST6.5 | New |
| STG-68 | Jump to a cue by typing its label | ST3.9 | New |
| STG-69 | Present a song, a scripture and a countdown with no plan open | ST3.10 | New |
| STG-70 | Enforce the cache ceiling with LRU eviction, and show what Stage uses on disk | ST2.11, ST2.12 | New |
| STG-71 | Add a passage live by typing a reference, resolved from the cache | ST5.4, ST5.5 | New |
| STG-72 | Confirm anything that interrupts the service, with a key that is not the advance key | ST10.7 | New |
| STG-73 | Soak test three hours with video backgrounds, asserting no memory growth | ST20.6, ST20.7 | New |

---

## SE4. The team (S0.4)

Everything that happens once more than one person is involved.

### SF12. Remote control

| ID | Story | Req | State |
|---|---|---|---|
| STG-74 | Serve the remote on the local network, paired by a code shown on the control surface | ST12.1, ST12.2 | New |
| STG-75 | Advance, reverse, black and jump from the remote, and show the deck and the notes | ST12.3, ST12.5 | New |
| STG-76 | Keep two controllers and the laptop consistent within 300ms | ST12.4, ST12.6 | New |

### SF13. Triggers

| ID | Story | Req | State |
|---|---|---|---|
| STG-77 | Customise hotkeys, and print the defaults on one card | ST10.8 | New |
| STG-78 | Fire several actions from one trigger as a macro | ST10.9 | New |
| STG-79 | Support a Stream Deck with cue, black and macro buttons | ST13.1 | New |
| STG-80 | Accept and emit MIDI | ST13.2 | New |
| STG-81 | Accept and emit OSC, with every address documented | ST13.3 | New |
| STG-82 | Emit an outbound trigger on cue change, so a lighting desk can follow | ST13.4 | New |
| STG-83 | Keep every integration off by default, and prove none can block a cue | ST13.6 | New |

### SF7, SF9, SF17. The rest

| ID | Story | Req | State |
|---|---|---|---|
| STG-84 | Play audio and video as plan items, with in and out points and an end behaviour | ST7.6, ST7.7 | New |
| STG-85 | Show props and overlays independently of the slide | ST12 outline, ST14.4 | New |
| STG-86 | Address a named group of outputs together | ST8.8 | New |
| STG-87 | Send a message to the stage display from the control surface or the remote | ST9.7 | New |
| STG-88 | Run a sermon timer from the plan's planned duration | ST9.8 | New |
| STG-89 | Snapshot the run as it happened, so the second service reopens it | ST3.12 | New |
| STG-90 | Push service run telemetry for the plan's revision history | ST17.5 | New |

---

## SE5. The broadcast and the move (S1.0)

Public launch of Stage.

### SF14. Broadcast

| ID | Story | Req | State |
|---|---|---|---|
| STG-91 | Output NDI per output group | ST14.1, ST14.5 | New |
| STG-92 | Output alpha-keyed lyrics with clean antialiased edges | ST14.2 | New |
| STG-93 | Give the keyed output its own theme, sized for camera | ST14.3 | New |
| STG-94 | Add lower-third mode, independent of the main slide | ST14.4 | New |

### SF15. Language

| ID | Story | Req | State |
|---|---|---|---|
| STG-95 | Render bilingual slides from section-aligned translations | ST15.1, ST4.9 | New |
| STG-96 | Carry a different language on a second output | ST15.2 | New |
| STG-97 | Stream caption output for the livestream's caption track | ST15.3, ST5.6, ST19.6 | New |
| STG-98 | Support right-to-left text and a font fallback chain | ST4.10 | New |

### SF6. Themes, properly

| ID | Story | Req | State |
|---|---|---|---|
| STG-99 | Edit a theme in Stage, with a contrast check that refuses a lyric theme below 7:1 | ST6.6 | New |
| STG-100 | Save a theme, background and overlay together as a named template | ST6.7 | New |
| STG-101 | Import a font the church owns, stating the licence responsibility at import | ST6.8 | New |
| STG-102 | Use a live camera as a background layer, with a frozen fallback | ST7.8 | New |

### SF16. The move

| ID | Story | Req | State |
|---|---|---|---|
| STG-103 | Read ProPresenter, EasyWorship, OpenLP, OpenSong and OpenLyrics libraries into the platform's schema, in a shared package | ST16.1, ST16.2 | New |
| STG-104 | Import a PowerPoint or Keynote deck as a plan item of ordered slides | ST16.3 | New |
| STG-105 | Match imported media, and list what is missing | ST16.5 | New |

### SF18. Shipping

| ID | Story | Req | State |
|---|---|---|---|
| STG-106 | Sign and notarise macOS, sign Windows, build AppImage and deb | ST18.9, ST20.11 | New |
| STG-107 | Auto-update in the background, applied by the operator, held outside the Sunday window | ST18.6 | New |
| STG-108 | Roll back to the previous version from inside Stage | ST18.7 | New |
| STG-109 | Export the cache as a portable bundle for a church with no usable wifi | ST2.13 | New |
| STG-110 | Serve a view-only remote for the preacher and the host | ST12.7 | New |
| STG-111 | Document the local HTTP control API | ST13.5 | New |
| STG-112 | Pair a device to one campus, and sync only that campus's services | ST1.9 | New |

---

## What the platform owes Stage

Specified in full in [docs/stage-sync-contract.md](docs/stage-sync-contract.md). These become stories
on the **platform** board with `HRT-n` IDs when platform 0.4 is planned. **SE2 is blocked until all
six land.**

| Owed | Platform requirement | Note |
|---|---|---|
| The song schema: sections ordered and labelled, sequences as data, translations section aligned | R12.1 to R12.7, R12.9 | PRD section 9.4. This is the one that costs a rewrite if it is wrong. |
| Service plans readable as data: ordered items, arrangement and key, resolved scripture text, notes per position | R11.1 to R11.6, R11.14 | |
| `change_seq` on every synced table, from a per-tenant sequence | R11.14 | Set by the trigger that already writes the audit entry |
| The device principal: table, token hashing, scope enforced in the query layer, pairing code UI, device list with revoke | R11.14, R1.5, R1.10 | Sits beside the active session list, which exists |
| The nine routes under `/api/stage/v1` | R11.14, R12.13 | |
| Idempotent `song_usage` insert keyed on the client id, feeding the CCLI export | R12.9, R12.10 | |

Stage owes the platform the usage rows, and nothing else.

---

## Execution plan

### The order, and why

**SE1 first, on fixtures, with no platform dependency.** The render is the part that can be judged
before anything is connected, and it is the part that is expensive to retrofit. The same reasoning put
the design gallery first on the platform board.

Inside SE1 the order is forced: `packages/songs` before anything can compile a deck, the deck before
anything can be rendered, the render before the control surface has something to control, and the
measurement harness alongside the render rather than after it, because a latency budget written after
the fact is a wish.

**SE2 waits on platform 0.4.** It is the release that makes Stage worth building, and it cannot start
early. The gap is not idle: SE1's fixture library is generated from the sync contract's own payload
schema (STG-6), so the day the API exists the client is writing into a store whose shape is already
proven.

**SE3 before SE4.** A church cannot leave ProPresenter without the stage display, several outputs,
video backgrounds, and crash recovery. It can leave without a Stream Deck.

**SE5 last**, because NDI, imports, and three signed installers are all work that only matters once
churches are actually arriving.

### Working method

Unchanged from [CLAUDE.md](CLAUDE.md). One story Active on this board. Built, then what to test is
written down plainly, then stop. The next story does not start until the last one has been used by
hand.

### The dependency, stated plainly

Stage S0.1 can be built now, in full, with no platform work. Stage S0.2 cannot start until the
platform's 0.4 song library and sync API exist. The platform board currently has 0.2 still to close
and 0.3 money ahead of 0.4, so the gate is some distance out. SE1 is roughly twenty-three stories,
which is enough work that the gate is unlikely to be the thing waiting.

---

## Now

| | |
|---|---|
| **Active** | Nothing |
| **Next** | **STG-1**, scaffold `packages/songs`. Then STG-2 to STG-6, the domain, which is pure logic and fully testable before any Electron process exists. |
| **Blocked** | All of **SE2**, on the six platform deliverables above. |
| **Not started** | Everything. This board was written 1 October 2026, before any Stage code. |
| **Watch** | `packages/songs` is read by the platform's song library screens in 0.4. The schema in PRD section 9.4 is the contract between the two, and a change to it is a platform story. |

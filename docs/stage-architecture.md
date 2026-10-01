# Hearth Stage architecture

How Stage is built. [PRD-STAGE.md](../PRD-STAGE.md) says what it does.
[docs/stage-sync-contract.md](stage-sync-contract.md) says how it talks to the platform.

## Shape

```
apps/
  stage                 Electron application
    src/main            Main process: windows, displays, SQLite, sync, triggers
    src/preload         Typed IPC bridge, channel allowlist
    src/control         Renderer: the operator's control surface
    src/output          Renderer: an output window, one per display
    src/display         Renderer: stage display and confidence monitor
    src/remote          Served to a phone on the local network
packages/
  songs                 Song model, sequence resolution, ChordPro, deck compilation
  stage-protocol        IPC and local control API types, shared by main and renderers
  ui                    Design tokens and components, shared with the web app
  i18n                  String catalogue, shared with the web app
```

`packages/songs` is the reason this is a monorepo. The platform's music stand view and Stage's slides
resolve the same arrangement with the same function, so they cannot disagree.

## Why Electron

Three things decide it, and they are the three things a browser tab cannot do.

1. **Real displays.** One fullscreen window per physical display, addressed by display identity so
   the Sunday projector always lands on the same output (ST8.4). A browser offers one fullscreen
   element on the display it happens to be on.
2. **No network in the render path.** A local SQLite cache, a content-addressed media directory on
   disk, and a token in the operating system keychain (ST20.8).
3. **Hardware.** Hardware video decode, MIDI, OSC, NDI, and a Stream Deck, all native.

The cost is a 150MB installer and Chromium's memory floor, which is why ST20.5 names 2019 hardware as
the measurement target rather than a developer's laptop.

## Processes

```
                     ┌──────────────────────────────┐
                     │ main                         │
                     │  display manager             │
   keychain ◄────────┤  deck compiler (packages/songs)
   SQLite   ◄────────┤  sync client                 │
   media dir◄────────┤  usage queue                 │
                     │  hotkeys, MIDI, OSC          │
                     │  local HTTP server (remote)  │
                     └───┬────────┬────────┬────────┘
                         │        │        │   typed IPC, state down, intent up
              ┌──────────▼┐  ┌────▼─────┐  ┌▼──────────┐
              │ control    │  │ output n │  │ display   │
              │ (office)   │  │ (dumb)   │  │ (station) │
              └────────────┘  └──────────┘  └───────────┘
```

**Main owns all state.** Every renderer is a function of state it is handed. No renderer reads the
database, holds the token, or decides what is live.

**Renderers are sandboxed.** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, a
preload exposing a named channel allowlist, and a content security policy with no remote origins. An
output window renders church lyrics from a local cache and has no business holding a filesystem
handle.

**One renderer per output.** An output crashing takes out one screen, which main restarts
automatically, and leaves the others running (ST18.3). One window driving several displays would mean
one crash taking the whole room dark.

### IPC

Typed in `packages/stage-protocol`, and one-directional in meaning:

- **Down: state.** `OutputState` is the complete description of what an output should show. A renderer
  diffs it and paints. There is no "advance" message to an output.
- **Up: intent.** The control surface sends `Advance`, `GoTo`, `Black`. Main decides what that means
  and broadcasts new state.

The payoff is that recovery, the remote, the Stream Deck, and the control surface are all the same
code path. A restored session is state applied to fresh renderers, which is why ST18.1's five seconds
is achievable.

## The deck

Compilation is pure, lives in `packages/songs`, and runs in main.

```
plan + songs + arrangements + themes
          │
          ▼  compileDeck()        pure, deterministic, unit tested
   Deck { groups: CueGroup[] }
          │
          ▼  one cue
   Cue { kind, slide, theme, background, meta }
          │
          ▼  resolve()
   OutputState per output
```

- A **cue group** is a plan item. A **cue** is a slide, or a marker for a non-presenting item (ST3.4).
- A song's cues come from resolving the arrangement's `sequence` against the song's labelled sections.
  `V1 C V2 C B C C` produces seven groups of slides, repeats included as separate cues (ST3.2).
- A section longer than the theme's line limit splits into several cues, breaking on line boundaries
  (ST4.1).
- **Compilation is deterministic**, so it is tested against golden fixtures. A sequence referencing a
  label the song does not have fails at compile time with the label named, rather than at 10:31 on a
  Sunday (ST3.2 acceptance).
- Compilation happens when a service is opened and when a plan change is accepted. Never during a cue
  advance.

### Text fitting

By measurement (ST4.2).

Fitting is a binary search over font size against a measured text bounding box, run in an offscreen
renderer at deck compile time, with the result cached by `(text, theme id, output resolution)` in
SQLite. All slides in one section share the smallest size any of them needs, so words do not jump
between slides.

The point is that **no measurement happens in the render path**. An advance applies a cached size.

### Advance

```
key event → control → IPC intent → main: cue index += 1
          → OutputState broadcast → output renderer: swap layers
```

The budget is 100ms at the 99th percentile (ST20.1), measured by frame capture rather than by a
timestamp in the code. What keeps it inside the budget:

- The next cue's slide is already in the DOM, composited, at opacity zero. An advance is an opacity
  transition on two GPU layers.
- The media for the next cue is already decoded and the next-but-one is prefetched.
- Between the key and the pixels there is no layout, measurement, database read, or network call.

## Local store

**SQLite** through `better-sqlite3`, in the Electron userData directory, WAL mode.

Three concerns, deliberately separated:

| Store | Contents | Lifetime |
|---|---|---|
| `cache.db` | Everything synced from the platform, plus the fitting cache | Disposable. Deleted and rebuilt by a full resync. |
| `local.db` | Usage queue, the live cue pointer, output configuration, this run's overrides, deck snapshots | **Durable.** This is the only data Stage authors. |
| `media/` | Content-addressed files, `media/sha256/ab/cd/<hash>` | LRU evicted against the ceiling (ST2.11) |

Splitting them is what makes ST18.4 work: a corrupt cache is deleted and resynced without losing the
usage rows that have not been pushed yet.

The schema mirrors the platform's column names so the sync client is an insert rather than a
transformation. Drizzle is used for the query layer here too, against SQLite, so the song queries read
the same way they do on the platform.

### Sync

- Runs in main, on a worker thread, off the path of a cue.
- A `changes` loop, then body fetches, then **one transaction per page that writes the rows and
  advances the cursor together**. A crash replays, and replay is safe because every write is an
  upsert (contract, "the sync model").
- Backoff on failure, and every failure path ends in serving the cache.
- The usage queue is drained on reconnect, idempotently.

## Media pipeline

- Video backgrounds play in a `<video>` element in the output renderer, hardware decoded, looping
  seamlessly by double buffering two elements and crossfading at the loop point.
- A still background is an `<img>`, pre-decoded with `decode()` before the cue it belongs to becomes
  next.
- Text composites in a layer above the background, and the two never share a compositing layer, so a
  text dissolve does not force the video to re-raster.
- A missing or undecodable file degrades to the theme's solid colour, and says so on the control
  surface and never on the output (ST7.9).

## Displays

Display identity, rather than index, is the whole trick (ST8.4).

A display's identity is a stable hash of manufacturer, model, serial where available, and EDID, and it
falls back to position and resolution where it is not. Output configuration is stored against that
identity, so unplugging the projector and plugging it back in restores the same output to the same
screen.

A display disappearing closes its window and keeps its configuration. The display reappearing reopens
the window and applies current state, so the output comes back on the live slide (ST8.5).

## Remote control

A local HTTP server in main, serving `src/remote` and a small websocket for state.

- **Local network only.** It binds to the LAN interface, and nothing is proxied
  through our servers (ST12.2).
- Pairing by a code shown on the control surface, exchanged for a session cookie scoped to that
  device.
- The remote sends the same intents as the control surface and receives the same state, so two
  controllers cannot diverge (ST12.4).
- Losing the remote's wifi has no effect on the laptop, and the remote reconnects to current state
  (ST12.6).

The same server is the documented local control API in ST13.5.

## Design system

Stage uses `packages/ui` tokens, with no fourth density mode invented for it (ST19.3):

| Surface | Density |
|---|---|
| Control window | `office`, dense and keyboard-first |
| Stage display | `station`, read from twenty feet |
| Remote | `portal`, one-handed on a phone |

**Output rendering is not a user interface.** It uses a separate theme system (ST6.2), because
typography sized for a projector in a dark room is a different problem from typography on a laptop.
The themes borrow the palette and the type scale, and they do not borrow the component library.

## Testing

| Layer | How |
|---|---|
| `packages/songs` | Unit tests. Sequence resolution, section splitting, ChordPro transposition against the same fifty-chart fixture set the platform uses for R12.6. |
| Deck compilation | Golden fixtures. A library of fifty arrangements compiles to expected decks, including the failure cases. |
| Rendering | A headless harness rasterises every slide in a 200-song fixture library at three resolutions, asserting no glyph crosses the safe area and no region falls below 7:1 contrast (ST4.4, ST19.4). |
| Control surface | Playwright against Electron. A full service run with the pointer disconnected (ST10.1). |
| Sync | Against a real platform instance in CI, plus a fault injection suite: held-open connections, 500s, revoked tokens, invalid cursors, a corrupt cache. |
| Performance | Advance latency by frame capture, a three-hour soak with video backgrounds, and cold start, all on the ST20.5 reference hardware, recorded per release. |
| Recovery | `kill -9` mid-song, ten times, asserting the live slide inside five seconds (ST18.1). |
| Architecture | A test that fails the build if anything in the render path can reach the network or the sync client (ST20.8). |

**The S0.1 release ships the render harness and the latency measurement.** Performance budgets written
after the fact are wishes.

## Packaging

- `electron-builder`. macOS signed and notarised, Windows signed, Linux AppImage and deb (ST18.9).
- `electron-updater`, downloading in the background, applying on the operator's say-so, and **refusing
  to prompt inside a Sunday window**, which is the same rule the platform's deploys follow (ST18.6).
- The previous version is retained and rolled back to from inside Stage (ST18.7).
- Installer under 150MB per platform (ST20.11), which means the bundled video loops are few and
  compressed.

## Security

| Concern | Handling |
|---|---|
| Device token | Operating system keychain through `safeStorage`. It stays out of the cache directory, out of the logs, and out of every renderer. |
| Renderers | Sandboxed, context isolated, no node integration, CSP with no remote origins. |
| IPC | A named channel allowlist in preload. Every payload validated in main. |
| Remote server | LAN interfaces only, paired by code, session scoped. |
| Local data | Cached lyrics and plan notes are not encrypted at rest, because a presenter laptop that cannot read its own cache without a password cannot start at 10:28. Pastoral notes and confidential classes are never synced in the first place, which is the actual control. |
| Logs | Scrubbed of lyrics, names, and the token, and never transmitted without the operator's action (ST18.8, ST20.12). |

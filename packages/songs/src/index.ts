/**
 * @connectapp/songs
 *
 * The song model. Written when this repository was to own the shared song
 * library; Hearth Stage now has its own, and nothing here imports this
 * package. See docs/repository-inventory.md before changing or removing it.
 *
 * No runtime dependencies, by design: the package was meant to be called from
 * a Next.js server action, an Electron main process and a worker thread, so
 * anything it imported all three would have had to carry.
 */

export {
  SECTION_TYPES,
  MEDIA_KINDS,
  SONG_ORIGINS,
  USAGE_SOURCES,
  type SectionType,
  type MediaKind,
  type SongOrigin,
  type UsageSource,
  type Song,
  type SongSection,
  type Arrangement,
  type ArrangementMedia,
  type WholeSong,
  type SongUsage,
} from "./types";

export {
  TONICS,
  type Tonic,
  type Key,
  isTonic,
  isKey,
  tonicOf,
  isMinor,
  semitonesFromC,
  parseKey,
  isTimeSignature,
} from "./keys";

export {
  MARKER_KINDS,
  type MarkerKind,
  type ItemNote,
  type Verse,
  type SongItem,
  type ScriptureItem,
  type MarkerItem,
  type ServiceItem,
  type ServicePlan,
  orderedItems,
  plannedSeconds,
  notesFor,
} from "./service";

export {
  resolveSequence,
  pickArrangement,
  formatSequence,
  parseSequence,
  type ResolvedSection,
  type ResolvedSequence,
  type SequenceProblem,
} from "./sequence";

export {
  splitSection,
  splitBilingual,
  DEFAULT_LIMITS,
  type Slide,
  type SlideLimits,
  type BilingualSlide,
} from "./slides";

export {
  compileDeck,
  lookupFrom,
  nextCue,
  cueAt,
  positionOf,
  groupOf,
  deckIsComplete,
  type Deck,
  type Cue,
  type CueGroup,
  type CueKind,
  type DeckProblem,
  type SongLookup,
  type CompileOptions,
} from "./deck";

export {
  validateWholeSong,
  hasErrors,
  errorsOnly,
  type Severity,
  type SongProblem,
  type SongProblemCode,
} from "./validate";

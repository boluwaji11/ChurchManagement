/**
 * @hearth/songs
 *
 * The song model, shared by the web platform and Hearth Stage. See the package
 * README for what belongs here and what deliberately does not.
 *
 * This package has no runtime dependencies, and it never will. It is called
 * from a Next.js server action, from an Electron main process, from a worker
 * thread reading a ProPresenter file, and from a test, so anything it imports
 * all four have to carry.
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
  validateWholeSong,
  hasErrors,
  errorsOnly,
  type Severity,
  type SongProblem,
  type SongProblemCode,
} from "./validate";

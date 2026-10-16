"use client";

/**
 * HRT-378. What every part of the editor is handed.
 *
 * The workspace holds the document, the history and the saving, and passes this
 * down. A panel changes the website by building the next document and calling
 * `change`, which is the only way anything is written: there is one place that
 * decides what an undo step is and what gets saved, rather than one per panel.
 */

import type {
  SiteDoc, SiteImage, SitePage, SiteSection,
} from "@connectapp/db/rules";
import type { SiteCtx } from "@/components/church-site/kit";
import type { Panel, Selection } from "./store";

/** What the editor knows about the church, for the pickers and the nudges. */
export interface BuilderChurch {
  name: string;
  slug: string;
  /** The church's own address, as one line, or nothing where it has none. */
  address: string | null;
  hasServiceTimes: boolean;
  takesGifts: boolean;
  logoKey: string | null;
  /** Where the published website answers. */
  liveUrl: string;
  canPublish: boolean;
}

/** One of the church's published forms, for the form section and for a button. */
export interface FormChoice {
  slug: string;
  name: string;
}

export interface GroupTypeChoice {
  id: string;
  name: string;
}

/** A photograph the church has already uploaded. */
export interface MediaItem {
  key: string;
  bytes: number;
  uploadedAt: string;
  /** Whether any page of the draft points at it. */
  inUse: boolean;
}

export interface BuilderApi {
  doc: SiteDoc;
  pageId: string;
  page: SitePage;
  selected: Selection | null;
  /** The church as the sections see it, for a thumbnail or a preview. */
  site: SiteCtx;
  church: BuilderChurch;
  forms: FormChoice[];
  groupTypes: GroupTypeChoice[];
  media: MediaItem[];
  publishedAt: string | null;
  changed: boolean;

  /**
   * Writes the next document.
   *
   * `merge` joins this change to the one before it in the history, so a run of
   * keystrokes or a dragged slider is one undo step. Pass the same string for
   * every change in the run, and nothing for a change that stands alone.
   */
  change: (doc: SiteDoc, merge?: string) => void;
  select: (selection: Selection | null) => void;
  setPanel: (panel: Panel | null) => void;
  setPage: (pageId: string) => void;
  /** Opens the library, with the position the new section will land at. */
  openLibrary: (at: number) => void;
  /** Opens the layout chooser for one section. */
  openLayout: (sectionId: string) => void;
  /** Opens the gallery of starting designs. */
  openGallery: () => void;
  /**
   * Opens the photographs, saying where the next one chosen should land.
   *
   * Without it the panel could only write into whatever happens to be selected,
   * which covers a section's own picture and leaves a band's background and the
   * header's mark with a Replace button that does nothing.
   */
  openMedia: (target: { sectionId: string; path: string } | null) => void;
  /** Where the panel is to put the next photograph, when it was told. */
  mediaFor: { sectionId: string; path: string } | null;

  /** Uploads a photograph and returns it as a picture, or nothing on failure. */
  uploadMedia: (file: File) => Promise<SiteImage | null>;
  /** Takes a photograph out of this church's storage. */
  removeMedia: (key: string) => Promise<void>;

  /** A new section of this kind, with the starting words already in it. */
  newSection: (type: string, variant: string) => SiteSection;
  /** A new page from one of the starters. */
  newPage: (starter: string) => SitePage;
  /** A readable id, for a duplicate. */
  newId: (stem: string) => string;
}

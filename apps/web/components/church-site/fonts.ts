/**
 * HRT-380, R22.2, R24.6. The faces a church's website can be set in.
 *
 * Six pairings, ten families, served by Next's font pipeline so they are
 * self-hosted, subset and loaded with no layout shift. None of them is
 * preloaded: a church uses one pairing, and preloading the other nine would
 * spend a visitor's first connection on faces its page never sets.
 *
 * Each call is written out in full rather than sharing a spread of the common
 * options, because the loader reads these arguments at build time and refuses
 * anything it cannot see literally.
 *
 * Imported only by the church website and by the editor's canvas, so the admin
 * product's own pages never carry them.
 */

import {
  Archivo, EB_Garamond, Fraunces, Inter, Lora, Outfit, Playfair_Display,
  Source_Sans_3, Source_Serif_4, Work_Sans,
} from "next/font/google";

const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--site-font-fraunces",
  display: "swap",
  preload: false,
});
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--site-font-inter",
  display: "swap",
  preload: false,
});
const outfit = Outfit({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--site-font-outfit",
  display: "swap",
  preload: false,
});
const playfair = Playfair_Display({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--site-font-playfair",
  display: "swap",
  preload: false,
});
const lora = Lora({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--site-font-lora",
  display: "swap",
  preload: false,
});
const sourceSerif = Source_Serif_4({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--site-font-source-serif",
  display: "swap",
  preload: false,
});
const sourceSans = Source_Sans_3({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--site-font-source-sans",
  display: "swap",
  preload: false,
});
const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--site-font-archivo",
  display: "swap",
  preload: false,
});
const garamond = EB_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--site-font-garamond",
  display: "swap",
  preload: false,
});
const workSans = Work_Sans({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--site-font-work-sans",
  display: "swap",
  preload: false,
});

/** Every face's variable, for the element that wraps a church's website. */
export const SITE_FONT_CLASS = [
  fraunces.variable, inter.variable, outfit.variable, playfair.variable,
  lora.variable, sourceSerif.variable, sourceSans.variable, archivo.variable,
  garamond.variable, workSans.variable,
].join(" ");

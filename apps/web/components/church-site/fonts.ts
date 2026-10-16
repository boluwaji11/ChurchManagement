/**
 * HRT-380, R22.2, R24.6. The faces a church's website can be set in.
 *
 * Six pairings, ten families, served by Next's font pipeline so they are
 * self-hosted, subset and loaded with no layout shift. None of them is
 * preloaded: a church uses one pairing, and preloading the other nine would
 * spend a visitor's first connection on faces its page never sets.
 *
 * Imported only by the church website and by the editor's canvas, so the admin
 * product's own pages never carry them.
 */

import {
  Archivo, EB_Garamond, Fraunces, Inter, Lora, Outfit, Playfair_Display,
  Source_Sans_3, Source_Serif_4, Work_Sans,
} from "next/font/google";

const common = { subsets: ["latin", "latin-ext"] as const, display: "swap" as const, preload: false };

const fraunces = Fraunces({ ...common, weight: "variable", variable: "--site-font-fraunces" });
const inter = Inter({ ...common, weight: "variable", variable: "--site-font-inter" });
const outfit = Outfit({ ...common, weight: "variable", variable: "--site-font-outfit" });
const playfair = Playfair_Display({ ...common, weight: "variable", variable: "--site-font-playfair" });
const lora = Lora({ ...common, weight: "variable", variable: "--site-font-lora" });
const sourceSerif = Source_Serif_4({ ...common, weight: "variable", variable: "--site-font-source-serif" });
const sourceSans = Source_Sans_3({ ...common, weight: "variable", variable: "--site-font-source-sans" });
const archivo = Archivo({ ...common, weight: "variable", variable: "--site-font-archivo" });
const garamond = EB_Garamond({ ...common, weight: "variable", variable: "--site-font-garamond" });
const workSans = Work_Sans({ ...common, weight: "variable", variable: "--site-font-work-sans" });

/** Every face's variable, for the element that wraps a church's website. */
export const SITE_FONT_CLASS = [
  fraunces.variable, inter.variable, outfit.variable, playfair.variable,
  lora.variable, sourceSerif.variable, sourceSans.variable, archivo.variable,
  garamond.variable, workSans.variable,
].join(" ");

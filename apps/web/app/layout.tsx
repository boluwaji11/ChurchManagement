import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import { documentTheme } from "@/lib/theme";
import { canonicalAddress } from "@/lib/church-address";
import {
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  IBM_Plex_Serif,
  Noto_Color_Emoji,
} from "next/font/google";
import { TooltipProvider } from "@connectapp/ui";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { SandboxBanner, sandbox } from "@/components/sandbox-banner";

/**
 * IBM Plex across display, UI and codes. Self-hosted, no layout shift.
 */
const display = IBM_Plex_Serif({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600"],
  variable: "--font-ibm-plex-serif",
  display: "swap",
});
const sans = IBM_Plex_Sans({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--font-ibm-plex-sans",
  display: "swap",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
  preload: false,
});

/**
 * R16.9. One set of emoji, whoever is reading.
 *
 * Left to the machine, a mark against a message is drawn by Apple on one
 * desk, by Microsoft on the next and by a 2010 clip-art set on an old Windows
 * build, so the same thumbs up is three different pictures and two of them
 * date the product. Noto is flat, current, and the same on every screen.
 *
 * Only the characters that need it use it: the body text keeps IBM Plex Sans.
 */
const emoji = Noto_Color_Emoji({
  subsets: ["emoji"],
  weight: "400",
  variable: "--font-emoji",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "ConnectApp",
  description: "Church management software.",
};

export const viewport: Viewport = {
  /*
   * R17.5, R24.6. The member portal installs to a home screen and runs
   * without browser chrome, so the page has to say it will handle the
   * notch and the home indicator itself. Without this every
   * env(safe-area-inset-*) in the product resolves to zero and the tab
   * bar sits under the bar iOS draws at the bottom of the screen.
   */
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#1d1d2d" },
  ],
};

/**
 * R24.x. Light, dark, or whatever the device is set to.
 *
 * Read from a cookie on the server, so the first paint is already the right
 * one and nobody gets a white flash at 7am in a dark building. A church that
 * has chosen nothing works in light: an office is lit, and a working screen
 * that arrives dark because somebody's laptop is set that way is a surprise.
 * ConnectApp's own website follows the device instead, which `lib/theme.ts`
 * holds: somebody meeting the product has already told their computer how
 * they like to read.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  /* R1.1, R17.1. A church that picked a name is reached at it. The slug it
     started with sends people on rather than serving a second copy. */
  const elsewhere = await canonicalAddress();
  if (elsewhere) redirect(elsewhere);

  const { attr } = await documentTheme();

  return (
    <html
      lang="en"
      data-density="office"
      {...(attr ? { "data-theme": attr } : {})}
      suppressHydrationWarning
    >
      <body
        /* HRT-402. Outside production, the bar below is drawn and the
           viewport-height utilities give its height back. */
        data-env-bar={sandbox() ? "" : undefined}
        className={`${display.variable} ${sans.variable} ${mono.variable} ${emoji.variable} font-sans`}
      >
        {/* HRT-402. Outside production, every screen says so. */}
        <SandboxBanner />
        <TooltipProvider>{children}</TooltipProvider>
        {/*
         * How many people reach a page, and nothing about who they are.
         *
         * It sets no cookie, keeps no identifier across visits and sends the
         * route rather than the address, so a member's own page is counted as
         * /members/[id] and the id never leaves the browser. A church's data
         * is its own, and a visitor count is the most we take.
         */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

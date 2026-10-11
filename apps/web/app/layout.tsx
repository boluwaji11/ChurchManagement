import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import { documentTheme } from "@/lib/theme";
import { canonicalAddress } from "@/lib/church-address";
import { Fraunces, Inter, JetBrains_Mono, Noto_Color_Emoji } from "next/font/google";
import { TooltipProvider } from "@connectapp/ui";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

/**
 * Display serif for hierarchy, sans for work, mono for codes a volunteer reads
 * aloud, chosen so 0 and O cannot be confused. Self-hosted, no layout shift.
 */
const display = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
// Not used above the fold on most pages, so preloading it only earns a console
// warning about an unused preload.
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap", preload: false });

/**
 * R16.9. One set of emoji, whoever is reading.
 *
 * Left to the machine, a mark against a message is drawn by Apple on one
 * desk, by Microsoft on the next and by a 2010 clip-art set on an old Windows
 * build, so the same thumbs up is three different pictures and two of them
 * date the product. Noto is flat, current, and the same on every screen.
 *
 * Only the characters that need it use it: the body text keeps Inter.
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
 * ConnectApp's own website opens dark instead, which `lib/theme.ts` holds.
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
        className={`${display.variable} ${sans.variable} ${mono.variable} ${emoji.variable} font-sans`}
      >
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
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { documentTheme } from "@/lib/theme";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import { TooltipProvider } from "@connectapp/ui";
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
  const { attr } = await documentTheme();

  return (
    <html
      lang="en"
      data-density="office"
      {...(attr ? { "data-theme": attr } : {})}
      suppressHydrationWarning
    >
      <body className={`${display.variable} ${sans.variable} ${mono.variable} font-sans`}>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}

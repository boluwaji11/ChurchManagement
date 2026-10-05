import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import { TooltipProvider } from "@hearth/ui";
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
  title: "Hearth",
  description: "Church management software.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#232120" },
  ],
};

/**
 * R24.x. Light, dark, or whatever the device is set to.
 *
 * Read from a cookie on the server, so the first paint is already the right one
 * and nobody gets a white flash at 7am in a dark building. Leaving it off means
 * the device decides, which is what most members want and nobody has to choose.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = (await cookies()).get("hearth-theme")?.value;

  return (
    <html
      lang="en"
      data-density="office"
      {...(theme === "light" || theme === "dark" ? { "data-theme": theme } : {})}
      suppressHydrationWarning
    >
      <body className={`${display.variable} ${sans.variable} ${mono.variable} font-sans`}>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}

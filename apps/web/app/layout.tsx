import type { Metadata, Viewport } from "next";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-density="office" suppressHydrationWarning>
      <body className={`${display.variable} ${sans.variable} ${mono.variable} font-sans`}>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}

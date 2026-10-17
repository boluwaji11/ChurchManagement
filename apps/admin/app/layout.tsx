import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Serif } from "next/font/google";
import { TooltipProvider } from "@connectapp/ui";
import "./globals.css";

/** The same IBM Plex faces as the church-facing product. */
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

export const metadata: Metadata = {
  title: "ConnectApp Admin",
  description: "The platform's own portal.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#fbfaf9" }],
};

/**
 * R21.x. The team's portal.
 *
 * Light only and office density: this is a desk screen for the people running
 * ConnectApp, read on a laptop rather than on a phone in a foyer.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-density="office" data-theme="light" suppressHydrationWarning>
      <body className={`${display.variable} ${sans.variable} ${mono.variable} font-sans`}>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}

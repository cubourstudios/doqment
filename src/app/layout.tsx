import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

/*
 * Self-hosted by next/font rather than linked from Google's API: the file is
 * served from our own origin, so there is no extra DNS + TLS + stylesheet round
 * trip in front of first paint, and no flash of fallback text.
 */
const inter = Inter({
  variable: "--font-sans-family",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Doqment — know which documents you need, then create them",
    template: "%s · Doqment",
  },
  description:
    "Guided contracts, proposals and compliant invoices for freelancers. Tells you which documents a project needs, and why, then generates them.",
  applicationName: "Doqment",
  appleWebApp: {
    capable: true,
    title: "Doqment",
    statusBarStyle: "default",
  },
};

/**
 * `viewportFit: "cover"` lets the layout extend under the notch and home
 * indicator; the `safe-top` / `safe-bottom` utilities in globals.css then pad
 * back the parts that must stay tappable.
 *
 * `maximumScale` is deliberately left alone — capping zoom blocks users who
 * need to magnify text, and it isn't needed to stop iOS input zoom (a 16px
 * base font size does that).
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // One colour, because the app is pinned to its light theme (see
  // components/theme-provider.tsx). Handing the browser a dark chrome colour
  // on a dark-mode device would frame a white page in near-black.
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning is required by next-themes: it writes the theme
    // class on <html> before React hydrates, so server and client markup
    // legitimately differ on this one element.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
